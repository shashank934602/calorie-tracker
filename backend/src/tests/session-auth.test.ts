import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { authService } from '../services/auth.service';
import { tokenService, JwtAccessTokenPayload } from '../services/token.service';

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

async function runSessionAuthTests() {
  console.log('=== Running Production Authentication & Session Hardening Test Suite ===\n');

  const testEmail = `session_user_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

  // 1. Registration Test: Creates User, Session, and RefreshToken
  const registerResult = await authService.register(
    { name: 'Session Tester', email: testEmail, password: testPassword },
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    '127.0.0.1'
  );

  assertEqual(!!registerResult.user.id, true, 'Register: Created User record');
  assertEqual(!!registerResult.accessToken, true, 'Register: Generated short-lived access token');
  assertEqual(!!registerResult.rawRefreshToken, true, 'Register: Generated raw refresh token');

  // Verify access JWT payload and expiry
  const decoded = jwt.verify(registerResult.accessToken, env.JWT_SECRET) as JwtAccessTokenPayload;
  assertEqual(decoded.userId, registerResult.user.id, 'JWT: Access token contains correct userId');
  assertEqual(decoded.sessionId, registerResult.sessionId, 'JWT: Access token contains correct sessionId');

  // 2. Storage Security: Raw refresh token MUST NOT exist in DB
  const rawTokenInDb = await prisma.refreshToken.findFirst({
    where: { tokenHash: registerResult.rawRefreshToken },
  });
  assertEqual(rawTokenInDb, null, 'Security: Raw refresh token string is NEVER stored in database');

  const hashedTokenInDb = await prisma.refreshToken.findUnique({
    where: { tokenHash: tokenService.hashToken(registerResult.rawRefreshToken) },
  });
  assertEqual(hashedTokenInDb !== null, true, 'Security: SHA-256 hash of refresh token stored in database');
  assertEqual(hashedTokenInDb?.revokedAt, null, 'Token State: Initial refresh token is active');
  assertEqual(hashedTokenInDb?.replacedByTokenId, null, 'Token State: No replacement yet');

  // 3. Login Test: Creates a separate Session and RefreshToken
  const loginResult = await authService.login(
    { email: testEmail, password: testPassword },
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    '192.168.1.10'
  );
  assertEqual(loginResult.user.id, registerResult.user.id, 'Login: User ID matches registered user');
  assertEqual(loginResult.sessionId !== registerResult.sessionId, true, 'Multi-Device: Separate session created on login');

  // Check active sessions count (should be 2)
  const sessionsBefore = await authService.getUserSessions(registerResult.user.id, loginResult.sessionId);
  assertEqual(sessionsBefore.length, 2, 'Session Management: 2 active device sessions listed');
  const currentSession = sessionsBefore.find((s) => s.isCurrent);
  assertEqual(currentSession?.id, loginResult.sessionId, 'Session Management: Current session identified correctly');

  // 4. Token Rotation Test: Refreshing Token 1
  const token1 = registerResult.rawRefreshToken;
  const refresh1Result = await authService.refresh(token1, 'Mozilla/5.0 Updated', '127.0.0.1');

  assertEqual(refresh1Result.user.id, registerResult.user.id, 'Rotation: Refreshed user verified');
  assertEqual(refresh1Result.sessionId, registerResult.sessionId, 'Rotation: Session ID preserved');
  assertEqual(refresh1Result.rawRefreshToken !== token1, true, 'Rotation: New distinct refresh token issued');

  // Verify Token 1 in DB is now revoked and marked replacedBy Token 2
  const token1InDb = await prisma.refreshToken.findUnique({
    where: { tokenHash: tokenService.hashToken(token1) },
  });
  const token2InDb = await prisma.refreshToken.findUnique({
    where: { tokenHash: tokenService.hashToken(refresh1Result.rawRefreshToken) },
  });

  assertEqual(token1InDb?.revokedAt !== null, true, 'Rotation: Token 1 revokedAt is set');
  assertEqual(token1InDb?.replacedByTokenId, token2InDb?.id, 'Rotation: Token 1 replacedByTokenId points to Token 2');
  assertEqual(token2InDb?.revokedAt, null, 'Rotation: Token 2 is currently active');

  // 5. Multi-Generation Token Rotation: Rotate Token 2 to Token 3
  const token2 = refresh1Result.rawRefreshToken;
  const refresh2Result = await authService.refresh(token2, 'Mozilla/5.0 Updated', '127.0.0.1');
  const token3 = refresh2Result.rawRefreshToken;

  assertEqual(token3 !== token2 && token3 !== token1, true, 'Rotation 2: Distinct Token 3 issued');

  // 6. Strict Multi-Generation Reuse Detection: Presenting Token 1 (2 generations old)
  let reuseDetected = false;
  try {
    await authService.refresh(token1);
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    if (error.code === 'REFRESH_TOKEN_REUSE_DETECTED') {
      reuseDetected = true;
    }
  }
  assertEqual(reuseDetected, true, 'Reuse Detection: Presenting Token 1 triggered REFRESH_TOKEN_REUSE_DETECTED');

  // Verify that the compromised Session and all tokens in the family were completely revoked
  const revokedSession = await prisma.session.findUnique({
    where: { id: registerResult.sessionId },
  });
  assertEqual(revokedSession?.revokedAt !== null, true, 'Reuse Safety: Entire compromised session revoked immediately');

  // Attempting to refresh with Token 3 now fails because the session was revoked
  let sessionRevokedError = false;
  try {
    await authService.refresh(token3);
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    if (error.code === 'SESSION_REVOKED') {
      sessionRevokedError = true;
    }
  }
  assertEqual(sessionRevokedError, true, 'Reuse Safety: Active Token 3 in compromised session family is also blocked');

  // 7. Isolation Check: Login Session 2 is still active and unaffected
  const loginSessionCheck = await prisma.session.findUnique({
    where: { id: loginResult.sessionId },
  });
  assertEqual(loginSessionCheck?.revokedAt, null, 'Multi-Device Isolation: Unaffected session 2 remains active');

  // 8. Single Session Revocation Test
  await authService.revokeSession(registerResult.user.id, loginResult.sessionId);
  const revokedSession2 = await prisma.session.findUnique({
    where: { id: loginResult.sessionId },
  });
  assertEqual(revokedSession2?.revokedAt !== null, true, 'Session Revoke: Session 2 explicitly revoked');

  // 9. Logout All Test
  // Create two fresh sessions
  const s1 = await authService.login({ email: testEmail, password: testPassword });
  const s2 = await authService.login({ email: testEmail, password: testPassword });
  assertEqual((await authService.getUserSessions(registerResult.user.id)).length, 2, 'Logout-All: 2 active sessions created');

  await authService.logoutAll(registerResult.user.id);
  const sessionsAfterLogoutAll = await authService.getUserSessions(registerResult.user.id);
  assertEqual(sessionsAfterLogoutAll.length, 0, 'Logout-All: All active sessions revoked successfully');

  // 10. Multi-Tenant Protection: User A cannot revoke User B's session
  const userB = await authService.register(
    { name: 'User B', email: `user_b_${Date.now()}@example.com`, password: testPassword }
  );

  let crossTenantRevokeError = false;
  try {
    await authService.revokeSession(registerResult.user.id, userB.sessionId);
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 404) {
      crossTenantRevokeError = true;
    }
  }
  assertEqual(crossTenantRevokeError, true, 'Multi-Tenant Security: User A cannot revoke User B session');

  console.log('\n🎉 ALL PRODUCTION AUTHENTICATION & SESSION TESTS PASSED!\n');
}

runSessionAuthTests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
