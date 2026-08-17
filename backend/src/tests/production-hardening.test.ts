import { prisma } from '../config/prisma';
import app from '../app';
import http from 'http';
import { authService } from '../services/auth.service';
import { foodService } from '../services/food.service';
import { weightService } from '../services/weight.service';
import { resetAllRateLimiters } from '../middleware/rate-limit.middleware';

function assertEqual(actual: unknown, expected: unknown, testName: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(
      `❌ FAIL: ${testName}\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
}

function assertTruthy(val: unknown, testName: string) {
  if (val) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}\n  Expected truthy, got: ${val}`);
    process.exit(1);
  }
}

// Helper to make live HTTP requests against the Express app
function makeRequest(
  server: http.Server,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path: options.path,
        method: options.method,
        headers: options.headers || {},
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: rawData,
          });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runProductionHardeningTests() {
  console.log('=== Running Production Hardening Test Suite ===\n');

  // Start an ephemeral in-process HTTP server on port 0
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    console.log('--- 1. Security Headers (Helmet) & CORS ---');

    const healthRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/health',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    assertEqual(healthRes.status, 200, 'Health: Returned 200 OK');
    assertEqual(healthRes.headers['x-content-type-options'], 'nosniff', 'Security Header: X-Content-Type-Options nosniff');
    assertTruthy(healthRes.headers['x-frame-options'] || healthRes.headers['content-security-policy'], 'Security Header: Frame / CSP protection active');
    assertEqual(healthRes.headers['cross-origin-resource-policy'], 'cross-origin', 'Security Header: Cross-Origin Resource Policy');
    assertEqual(healthRes.headers['access-control-allow-origin'], 'http://localhost:5173', 'CORS: Explicit origin allowed');
    assertEqual(healthRes.headers['access-control-allow-credentials'], 'true', 'CORS: Credentials allowed');
    assertTruthy(healthRes.headers['x-request-id'], 'Observability: X-Request-Id header attached');

    console.log('\n--- 2. Request Body Limit (100KB) & 413 Handling ---');

    // Create a 150KB oversized payload
    const oversizedBody = JSON.stringify({
      data: 'A'.repeat(150 * 1024),
    });

    const oversizedRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      headers: {
        'Content-Type': 'application/json',
      },
      body: oversizedBody,
    });

    assertEqual(oversizedRes.status, 413, 'Payload Protection: Oversized request (>100KB) rejected with HTTP 413');
    const parsedOversized = JSON.parse(oversizedRes.body);
    assertEqual(parsedOversized.code, 'PAYLOAD_TOO_LARGE', 'Payload Protection: Clean error code returned');

    console.log('\n--- 3. Authentication Rate Limiting ---');

    resetAllRateLimiters();

    // Test Login Rate Limiting (5 allowed, 6th blocked)
    for (let i = 0; i < 5; i++) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com', password: 'Password123!' }),
      });
      assertEqual(res.status, 401, `Login Attempt ${i + 1}: Processed normally (401 invalid creds)`);
    }

    const blockedLoginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com', password: 'Password123!' }),
    });

    assertEqual(blockedLoginRes.status, 429, 'Login Limiter: 6th attempt rejected with HTTP 429');
    assertTruthy(blockedLoginRes.headers['retry-after'], 'Login Limiter: Retry-After header present');
    const parsedBlockedLogin = JSON.parse(blockedLoginRes.body);
    assertEqual(parsedBlockedLogin.code, 'LOGIN_RATE_LIMIT_EXCEEDED', 'Login Limiter: Correct rate limit code');

    // Test Register Rate Limiting (5 allowed, 6th blocked)
    resetAllRateLimiters();
    for (let i = 0; i < 5; i++) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/register',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `User ${i}`, email: `bad_email_${i}`, password: '123' }),
      });
      assertEqual(res.status, 400, `Register Attempt ${i + 1}: Processed normally (400 validation)`);
    }

    const blockedRegisterRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/register',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User 6', email: 'user6@example.com', password: 'Password123!' }),
    });

    assertEqual(blockedRegisterRes.status, 429, 'Register Limiter: 6th attempt rejected with HTTP 429');
    const parsedBlockedRegister = JSON.parse(blockedRegisterRes.body);
    assertEqual(parsedBlockedRegister.code, 'REGISTER_RATE_LIMIT_EXCEEDED', 'Register Limiter: Correct code');

    // Test Refresh Rate Limiting (30 allowed, 31st blocked)
    resetAllRateLimiters();
    for (let i = 0; i < 30; i++) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/refresh',
      });
      assertEqual(res.status, 401, `Refresh Attempt ${i + 1}: Processed normally (401 missing cookie)`);
    }

    const blockedRefreshRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/refresh',
    });
    assertEqual(blockedRefreshRes.status, 429, 'Refresh Limiter: 31st attempt rejected with HTTP 429');

    console.log('\n--- 4. AI Endpoint Rate Limiting ---');

    resetAllRateLimiters();

    // Register user for AI testing
    const testUser = await authService.register({
      name: 'Hardening User',
      email: `hardened_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    const authToken = testUser.accessToken;

    // Food Parse Limiter (20 allowed, 21st blocked)
    for (let i = 0; i < 20; i++) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/ai/food-parse',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ text: '2 eggs' }),
      });
      assertTruthy(res.status === 200 || res.status === 400 || res.status === 500, `Food Parse ${i + 1} processed`);
    }

    const blockedParseRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/ai/food-parse',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ text: '2 eggs' }),
    });
    assertEqual(blockedParseRes.status, 429, 'AI Food Limiter: 21st request rejected with HTTP 429');
    const parsedBlockedParse = JSON.parse(blockedParseRes.body);
    assertEqual(parsedBlockedParse.code, 'AI_FOOD_RATE_LIMIT_EXCEEDED', 'AI Food Limiter: Correct rate code');

    // AI Coach Limiter (15 allowed, 16th blocked)
    resetAllRateLimiters();
    for (let i = 0; i < 15; i++) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/ai/coach/chat',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ message: 'What to eat?' }),
      });
      assertEqual(res.status, 200, `AI Coach Chat ${i + 1} succeeded`);
    }

    const blockedCoachRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/ai/coach/chat',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ message: 'What to eat?' }),
    });
    assertEqual(blockedCoachRes.status, 429, 'AI Coach Limiter: 16th request rejected with HTTP 429');
    const parsedBlockedCoach = JSON.parse(blockedCoachRes.body);
    assertEqual(parsedBlockedCoach.code, 'AI_COACH_RATE_LIMIT_EXCEEDED', 'AI Coach Limiter: Correct rate code');

    console.log('\n--- 5. Multi-Tenant Security & Tenant Isolation ---');

    const userA = await authService.register({
      name: 'Tenant A',
      email: `tenant_a_${Date.now()}@example.com`,
      password: 'Password123!',
    });

    const userB = await authService.register({
      name: 'Tenant B',
      email: `tenant_b_${Date.now()}@example.com`,
      password: 'Password123!',
    });

    const chicken = await prisma.food.findUniqueOrThrow({ where: { name: 'Chicken Breast (Skinless)' } });

    // User A logs food and weight
    const foodEntryA = await foodService.createFoodEntry(userA.user.id, {
      foodId: chicken.id,
      quantityGrams: 150,
      mealType: 'lunch',
      consumedAt: new Date().toISOString(),
    });

    const weightEntryA = await weightService.createWeightEntry(userA.user.id, {
      weightKg: 78.5,
      recordedAt: new Date().toISOString(),
    });

    // User B attempts to modify or delete User A's food entry
    const crossFoodRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/food-entries/${foodEntryA.id}`,
      headers: { Authorization: `Bearer ${userB.accessToken}` },
    });
    assertEqual(crossFoodRes.status, 404, 'Multi-Tenant: User B cannot delete User A food entry (404 Not Found)');

    // User B attempts to delete User A's weight entry
    const crossWeightRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/weight/${weightEntryA.id}`,
      headers: { Authorization: `Bearer ${userB.accessToken}` },
    });
    assertEqual(crossWeightRes.status, 404, 'Multi-Tenant: User B cannot delete User A weight entry (404 Not Found)');

    // User B attempts to revoke User A's session
    const crossSessionRes = await makeRequest(server, {
      method: 'DELETE',
      path: `/api/auth/sessions/${userA.sessionId}`,
      headers: { Authorization: `Bearer ${userB.accessToken}` },
    });
    assertEqual(crossSessionRes.status, 404, 'Multi-Tenant: User B cannot revoke User A session (404 Not Found)');

    console.log('\n--- 6. Input Validation Bounds & Malformed Request Rejection ---');

    // Reject unknown/malformed JSON
    const malformedJsonRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: '{ "email": "broken_json_missing_brace',
    });
    assertEqual(malformedJsonRes.status, 400, 'Validation: Malformed JSON body rejected with HTTP 400');
    const parsedMalformed = JSON.parse(malformedJsonRes.body);
    assertEqual(parsedMalformed.code, 'INVALID_JSON', 'Validation: Code is INVALID_JSON');

    // Reject invalid mealType
    const invalidMealRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/food-entries',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.accessToken}`,
      },
      body: JSON.stringify({
        foodId: chicken.id,
        quantityGrams: 100,
        mealType: 'midnight_feast', // invalid enum
      }),
    });
    assertEqual(invalidMealRes.status, 400, 'Validation: Invalid mealType enum rejected with HTTP 400');

    // Reject excessive food quantity (>50,000g)
    const excessiveFoodRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/food-entries',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.accessToken}`,
      },
      body: JSON.stringify({
        foodId: chicken.id,
        quantityGrams: 999999, // exceeds max limit
        mealType: 'lunch',
      }),
    });
    assertEqual(excessiveFoodRes.status, 400, 'Validation: Excessive food quantity rejected with HTTP 400');

    console.log('\n🎉 ALL PRODUCTION HARDENING & SECURITY TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runProductionHardeningTests().catch((err) => {
  console.error('❌ Production Hardening test failed:', err);
  process.exit(1);
});
