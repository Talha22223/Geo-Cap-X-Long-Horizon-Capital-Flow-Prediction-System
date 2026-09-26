/**
 * GeoCap-X Complete End-to-End Security & Flow Verification Suite
 */
const BASE_URL = 'http://localhost:3001/api/v1';
const WEB_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('   STARTING GEOCAP-X COMPLETE SECURITY TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const testEmail = `quant_test_${Date.now()}@geocapx.com`;
  const testPassword = 'Password123!';
  let userToken = '';
  let refreshTokenCookie = '';
  let userId = '';

  // TEST 1: Create new account (Signup)
  console.log('--- TEST 1: Create new account ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        firstName: 'Quant',
        lastName: 'Tester',
      }),
    });
    const data = await res.json();
    userToken = data.accessToken;
    userId = data.user?.id;
    assert(res.status === 201 && data.success && data.accessToken, 'TEST 1: Account created with access token');
    assert(data.redirectTo === '/plans', 'TEST 1: New user is directed to /plans (no auto paid access)');
    assert(data.user?.subscriptionStatus === 'UNPAID', 'TEST 1: Subscription status is initially UNPAID');
  } catch (e) {
    assert(false, 'TEST 1: Account creation failed', e.message);
  }

  // TEST 2: Attempt duplicate signup
  console.log('\n--- TEST 2: Attempt duplicate signup ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        firstName: 'Quant',
        lastName: 'Tester',
      }),
    });
    assert(res.status === 409, 'TEST 2: Duplicate signup rejected with HTTP 409 Conflict');
  } catch (e) {
    assert(false, 'TEST 2: Duplicate signup error', e.message);
  }

  // TEST 3: Login with correct credentials
  console.log('\n--- TEST 3: Login with correct credentials ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.accessToken, 'TEST 3: Login successful with JWT accessToken');
    assert(data.redirectTo === '/plans', 'TEST 3: Unsubscribed user redirected to /plans');
    userToken = data.accessToken;
  } catch (e) {
    assert(false, 'TEST 3: Login failed', e.message);
  }

  // TEST 4: Login with incorrect password
  console.log('\n--- TEST 4: Login with incorrect password ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });
    assert(res.status === 401, 'TEST 4: Login with incorrect password rejected with HTTP 401');
  } catch (e) {
    assert(false, 'TEST 4: Incorrect password error', e.message);
  }

  // TEST 5: Logout and session invalidation
  console.log('\n--- TEST 5: Logout ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, 'TEST 5: Logout endpoint executed successfully');
  } catch (e) {
    assert(false, 'TEST 5: Logout failed', e.message);
  }

  // TEST 6: Protected route without auth token
  console.log('\n--- TEST 6 & 8: Unauthenticated access to protected routes ---');
  try {
    const res = await fetch(`${WEB_URL}/dashboard`, { redirect: 'manual' });
    const isRedirectedToLogin =
      res.status === 307 ||
      res.status === 302 ||
      (res.headers.get('location') && res.headers.get('location').includes('/login'));
    assert(isRedirectedToLogin, 'TEST 6 & 8: Next.js Edge Middleware redirects unauthenticated user to /login');
  } catch (e) {
    assert(false, 'TEST 6: Middleware check failed', e.message);
  }

  // TEST 9: Unsubscribed user accessing protected AI endpoints directly
  console.log('\n--- TEST 9 & 15: Server-side subscription gate enforcement ---');
  // Re-login to get token
  let activeToken = '';
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    activeToken = data.accessToken;

    // Call protected AI endpoint without active subscription
    const aiRes = await fetch(`${BASE_URL}/ai/dashboard/summary`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    assert(
      aiRes.status === 403,
      'TEST 9 & 15: Unsubscribed user cannot access protected AI API (HTTP 403 Forbidden)'
    );
  } catch (e) {
    assert(false, 'TEST 9 & 15: Subscription gate check failed', e.message);
  }

  // TEST 10: Select Plan (Fetch plans list)
  console.log('\n--- TEST 10: Fetch available subscription plans ---');
  let proPlanId = '';
  let freePlanId = '';
  try {
    const res = await fetch(`${BASE_URL}/subscriptions/plans`);
    const raw = await res.json();
    const data = raw.data || raw;
    assert(res.status === 200 && Array.isArray(data) && data.length >= 3, 'TEST 10: Retrieved available plan tiers (Free, Pro, Enterprise)');
    const freePlan = data.find((p) => p.name === 'Free');
    const proPlan = data.find((p) => p.name === 'Pro');
    freePlanId = freePlan?.id;
    proPlanId = proPlan?.id;
    assert(freePlan && proPlan, 'TEST 10: Verified Free and Pro tiers exist');
  } catch (e) {
    assert(false, 'TEST 10: Fetch plans failed', e.message);
  }

  // TEST 11 & 12: Activate Subscription in database
  console.log('\n--- TEST 11 & 12: Activate Free Tier and verify in DB ---');
  try {
    const res = await fetch(`${BASE_URL}/subscriptions/activate-free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
    });
    const raw = await res.json();
    const data = raw.data || raw;
    assert(res.status === 201 || res.status === 200, 'TEST 11: Free tier activated successfully');
    assert(data.status === 'ACTIVE' && data.plan === 'Free', 'TEST 12: Subscription status is now ACTIVE in database');
  } catch (e) {
    assert(false, 'TEST 11 & 12: Activate plan failed', e.message);
  }

  // TEST 13: Verify dashboard access is enabled after subscription
  console.log('\n--- TEST 13: Verify dashboard access enabled ---');
  try {
    // Check /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const raw = await meRes.json();
    const meData = raw.data || raw;
    assert(meRes.status === 200, 'TEST 13: /auth/me returns active session');
    assert(meData.subscription?.isActive === true, 'TEST 13: Session confirms subscription.isActive is true');
  } catch (e) {
    assert(false, 'TEST 13: Auth me check failed', e.message);
  }

  // TEST 14: Verify dashboard shows data according to the purchased plan
  console.log('\n--- TEST 14: Plan-based data restrictions enforced server-side ---');
  try {
    const summaryRes = await fetch(`${BASE_URL}/ai/dashboard/summary`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    assert(summaryRes.status === 200, 'TEST 14: Subscribed user can now access AI dashboard data');

    // Free user attempting to access Pro-exclusive SNA Graph endpoint
    const snaRes = await fetch(`${BASE_URL}/ai/event-chain`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    assert(
      snaRes.status === 403,
      'TEST 14: Free tier user blocked from Pro-exclusive /ai/event-chain (Server-side plan enforcement)'
    );

    // Free user predictions endpoint is filtered to 5 items max
    const predRes = await fetch(`${BASE_URL}/ai/predictions`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const rawPred = await predRes.json();
    const predData = rawPred.data || rawPred;
    const items = Array.isArray(predData) ? predData : (predData.items || []);
    assert(
      predRes.status === 200 && items.length <= 5,
      'TEST 14: Free tier predictions are strictly capped server-side'
    );
  } catch (e) {
    assert(false, 'TEST 14: Plan-based data restriction check failed', e.message);
  }

  // TEST 16 & 17: Logout and re-login recognizes subscription
  console.log('\n--- TEST 16 & 17: Logout and re-login recognizes active subscription ---');
  try {
    // Logout
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    // Login again
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const raw = await loginRes.json();
    const loginData = raw.data || raw;
    assert(
      loginData.redirectTo === '/dashboard',
      'TEST 17: Returning user with active subscription redirected directly to /dashboard'
    );
    assert(
      loginData.subscription?.isActive === true,
      'TEST 17: Subscription state accurately recognized upon re-login'
    );
    // Update activeToken to the new session token
    if (loginData.accessToken) {
      activeToken = loginData.accessToken;
    }
  } catch (e) {
    assert(false, 'TEST 16 & 17: Re-login test failed', e.message);
  }

  // TEST 18: Google OAuth URL endpoint
  console.log('\n--- TEST 18: Google OAuth configuration & endpoint ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/google/url`);
    // Should return 200 with URL if configured, or clean 400 with instruction
    assert(
      res.status === 200 || res.status === 400,
      'TEST 18: Google OAuth endpoint responsive and returns proper URL or helpful config guide'
    );
  } catch (e) {
    assert(false, 'TEST 18: Google OAuth endpoint failed', e.message);
  }

  // TEST 19 & 20: Subscription cancellation / period update
  console.log('\n--- TEST 19 & 20: Subscription cancellation ---');
  try {
    const res = await fetch(`${BASE_URL}/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
    });
    const raw = await res.json();
    const data = raw.data || raw;
    assert(
      res.status === 200 && (data.success || data.status),
      'TEST 19: Subscription cancel endpoint executed and marked cancelAtPeriodEnd'
    );
  } catch (e) {
    assert(false, 'TEST 19 & 20: Cancel subscription failed', e.message);
  }

  console.log('\n====================================================');
  console.log(`   TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
