import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../app';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth.service';
import { OAuth2Client } from 'google-auth-library';

// Helper to make live HTTP requests against in-memory Express server
const makeRequest = (
  server: http.Server,
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  data: any;
}> => {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') {
      return reject(new Error('Server not listening on a port'));
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedData: any = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            data: parsedData,
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
};

async function runGoogleAuthTests() {
  console.log('🚀 Starting Google Authentication Test Suite...\n');

  // Start ephemeral server for live HTTP validation
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const cleanupUserIds: string[] = [];

  try {
    // --------------------------------------------------------------------------
    // Test 1: Google Sign-In creates new user with passwordHash = null
    // --------------------------------------------------------------------------
    console.log('--- 1. Google Sign-In for New User ---');
    const testGoogleSub1 = `g_sub_test_${Date.now()}_1`;
    const testGoogleEmail1 = `google.newuser.${Date.now()}@example.com`;

    // Mock verifyIdToken on OAuth2Client prototype
    const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
    (OAuth2Client.prototype as any).verifyIdToken = async function (options: any) {
      if (options.idToken === 'valid_token_new_user') {
        return {
          getPayload: () => ({
            sub: testGoogleSub1,
            email: testGoogleEmail1,
            email_verified: true,
            name: 'Google New User',
            picture: 'https://example.com/photo.jpg',
          }),
        };
      } else if (options.idToken === 'valid_token_existing_user') {
        return {
          getPayload: () => ({
            sub: `g_sub_link_${Date.now()}`,
            email: `existing.user.${Date.now()}@example.com`,
            email_verified: true,
            name: 'Existing User Name',
          }),
        };
      } else if (options.idToken === 'unverified_email_token') {
        return {
          getPayload: () => ({
            sub: `g_sub_unverified_${Date.now()}`,
            email: 'unverified@example.com',
            email_verified: false,
            name: 'Unverified User',
          }),
        };
      } else {
        throw new Error('Invalid token signature or expired');
      }
    };

    const res1 = await makeRequest(server, '/api/auth/google', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.10' },
      body: JSON.stringify({ idToken: 'valid_token_new_user' }),
    });

    assert.equal(res1.statusCode, 200, 'Expected 200 OK for valid Google token');
    assert.equal(res1.data.status, 'success');
    assert.equal(res1.data.data.user.email, testGoogleEmail1);
    assert.equal(res1.data.data.user.name, 'Google New User');
    assert.ok(res1.data.data.accessToken, 'Access token should be returned');

    const createdUserId = res1.data.data.user.id;
    cleanupUserIds.push(createdUserId);

    // Verify database record
    const dbUser = await prisma.user.findUnique({
      where: { id: createdUserId },
    });
    assert.ok(dbUser, 'User must exist in database');
    assert.equal(dbUser.googleId, testGoogleSub1, 'googleId must match verified sub claim');
    assert.equal(dbUser.passwordHash, null, 'passwordHash must be null for Google-only user');

    // Verify Set-Cookie header contains HttpOnly refresh cookie
    const setCookie1 = res1.headers['set-cookie'] || [];
    const refreshCookieStr = setCookie1.find((c: string) => c.startsWith('calorietrack_refresh='));
    assert.ok(refreshCookieStr, 'calorietrack_refresh cookie must be set');
    assert.match(refreshCookieStr, /HttpOnly/i, 'Cookie must be HttpOnly');
    console.log('✅ PASS: Google Sign-In for new user creates account with null passwordHash and active session');

    // --------------------------------------------------------------------------
    // Test 2: Safe Existing-Account Linking
    // --------------------------------------------------------------------------
    console.log('\n--- 2. Safe Existing-Account Linking ---');
    const existingEmail = `existing.user.${Date.now()}@example.com`;
    const linkedGoogleSub = `g_sub_link_${Date.now()}`;

    // Register user with password first
    const registerRes = await makeRequest(server, '/api/auth/register', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.20' },
      body: JSON.stringify({
        name: 'Existing Password User',
        email: existingEmail,
        password: 'Password123!@#',
      }),
    });
    assert.equal(registerRes.statusCode, 201);
    const existingUserId = registerRes.data.data.user.id;
    cleanupUserIds.push(existingUserId);

    // Now sign in with Google with same email
    (OAuth2Client.prototype as any).verifyIdToken = async function (options: any) {
      return {
        getPayload: () => ({
          sub: linkedGoogleSub,
          email: existingEmail,
          email_verified: true,
          name: 'Existing Password User',
        }),
      };
    };

    const linkRes = await makeRequest(server, '/api/auth/google', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.20' },
      body: JSON.stringify({ idToken: 'valid_link_token' }),
    });

    assert.equal(linkRes.statusCode, 200);
    assert.equal(linkRes.data.data.user.id, existingUserId, 'Must link to existing user ID');

    const updatedDbUser = await prisma.user.findUnique({
      where: { id: existingUserId },
    });
    assert.ok(updatedDbUser);
    assert.equal(updatedDbUser.googleId, linkedGoogleSub, 'googleId must now be linked');
    assert.ok(updatedDbUser.passwordHash, 'Existing passwordHash must NOT be destroyed');
    console.log('✅ PASS: Safe account linking attaches googleId while preserving existing passwordHash');

    // --------------------------------------------------------------------------
    // Test 3: Password Login Guard on Google-Only Account
    // --------------------------------------------------------------------------
    console.log('\n--- 3. Password Login Guard for Google-Only Account ---');
    const loginAttemptRes = await makeRequest(server, '/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.30' },
      body: JSON.stringify({
        email: testGoogleEmail1,
        password: 'AnyPassword123!',
      }),
    });

    assert.equal(loginAttemptRes.statusCode, 401, 'Must reject password login for Google-only user');
    assert.match(
      loginAttemptRes.data.message,
      /Google Sign-In/i,
      'Error message must clearly inform user to sign in with Google'
    );
    console.log('✅ PASS: Password login correctly blocked for Google-only users');

    // --------------------------------------------------------------------------
    // Test 4: Invalid and Expired Token Rejection
    // --------------------------------------------------------------------------
    console.log('\n--- 4. Invalid Token Rejection ---');
    (OAuth2Client.prototype as any).verifyIdToken = async function () {
      throw new Error('Token used too late or signature invalid');
    };

    const invalidTokenRes = await makeRequest(server, '/api/auth/google', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.40' },
      body: JSON.stringify({ idToken: 'malformed_or_expired_token' }),
    });

    assert.equal(invalidTokenRes.statusCode, 401, 'Invalid Google token must return 401');
    assert.match(invalidTokenRes.data.message, /Invalid or expired Google ID token/i);
    console.log('✅ PASS: Invalid/expired Google ID token rejected with HTTP 401');

    // --------------------------------------------------------------------------
    // Test 5: Unverified Google Email Rejection
    // --------------------------------------------------------------------------
    console.log('\n--- 5. Unverified Email Rejection ---');
    (OAuth2Client.prototype as any).verifyIdToken = async function () {
      return {
        getPayload: () => ({
          sub: 'unverified_sub_123',
          email: 'unverified@example.com',
          email_verified: false,
          name: 'Unverified User',
        }),
      };
    };

    const unverifiedRes = await makeRequest(server, '/api/auth/google', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.50' },
      body: JSON.stringify({ idToken: 'unverified_token' }),
    });

    assert.equal(unverifiedRes.statusCode, 401, 'Unverified email must return 401');
    assert.match(unverifiedRes.data.message, /not verified/i);
    console.log('✅ PASS: Unverified Google email rejected with HTTP 401');

    // --------------------------------------------------------------------------
    // Test 6: Google Session Lifecycle (/me, /refresh, /sessions, /logout)
    // --------------------------------------------------------------------------
    console.log('\n--- 6. Google Session Lifecycle Verification ---');
    // Authenticate Google user again
    (OAuth2Client.prototype as any).verifyIdToken = async function () {
      return {
        getPayload: () => ({
          sub: testGoogleSub1,
          email: testGoogleEmail1,
          email_verified: true,
          name: 'Google New User',
        }),
      };
    };

    const googleAuthRes = await makeRequest(server, '/api/auth/google', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.60' },
      body: JSON.stringify({ idToken: 'valid_token_new_user' }),
    });

    assert.equal(googleAuthRes.statusCode, 200);
    const googleAccessToken = googleAuthRes.data.data.accessToken;
    const cookieHeader = (googleAuthRes.headers['set-cookie'] || [])
      .map((c: string) => c.split(';')[0])
      .join('; ');

    // 6a. GET /api/auth/me
    const meRes = await makeRequest(server, '/api/auth/me', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });
    assert.equal(meRes.statusCode, 200);
    assert.equal(meRes.data.data.user.email, testGoogleEmail1);
    console.log('✅ PASS: GET /api/auth/me works for Google-authenticated users');

    // 6b. POST /api/auth/refresh
    const refreshRes = await makeRequest(server, '/api/auth/refresh', {
      method: 'POST',
      headers: { Cookie: cookieHeader, 'x-forwarded-for': '192.168.1.60' },
    });
    assert.equal(refreshRes.statusCode, 200);
    assert.ok(refreshRes.data.data.accessToken, 'Rotated access token emitted');
    console.log('✅ PASS: Silent refresh rotation works for Google sessions');

    // 6c. GET /api/auth/sessions
    const sessionsRes = await makeRequest(server, '/api/auth/sessions', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });
    assert.equal(sessionsRes.statusCode, 200);
    assert.ok(Array.isArray(sessionsRes.data.data), 'Sessions array returned');
    console.log('✅ PASS: Session inspection works for Google-authenticated users');

    // Restore verifyIdToken
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;

    console.log('\n🎉 ALL GOOGLE AUTHENTICATION TESTS PASSED PERFECTLY!');
  } finally {
    // Cleanup created test users
    if (cleanupUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: cleanupUserIds } },
      });
    }
    await prisma.$disconnect();
    server.close();
  }
}

// Run test directly
runGoogleAuthTests().catch((err) => {
  console.error('❌ Google Auth Test Suite Failed:', err);
  process.exit(1);
});
