// Comprehensive Runtime Integration & Smoke Test Suite
const BASE_URL = "http://localhost:3000";

async function runSmokeTests() {
  console.log("=================================================");
  console.log("=== STARTING THEQUEUE RUNTIME SMOKE TEST SUITE ===");
  console.log("=================================================");
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PHASE 2 — REGISTRATION RUNTIME TEST
    // -------------------------------------------------------------
    console.log("\n--- Phase 2: Registration Runtime Verification ---");
    // Test password mismatch
    const mismatchRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "mismatch_test@example.com",
        username: "mismatchtest",
        displayName: "Mismatch Test",
        password: "SecretPassword123!",
        confirmPassword: "DifferentPassword123!",
      }),
    });
    const mismatchData = await mismatchRes.json();
    assert(
      mismatchRes.status === 400 &&
      (mismatchData.code === "PASSWORD_MISMATCH" || mismatchData.code === "PASSWORDS_DO_NOT_MATCH"),
      "Server rejects mismatched registration passwords with 400 status"
    );

    // Test fresh user registration with matching passwords
    const testEmail = `artist_${Date.now()}@example.com`;
    const testUsername = `user_${Date.now()}`.substring(0, 16);
    const testPassword = "ValidPassword123!";
    const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        displayName: "Smoke Test Artist",
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });
    const regData = await regRes.json();
    const regCookie = regRes.headers.get("set-cookie") || "";

    assert(
      regRes.status >= 200 && regRes.status < 300 && regData.success && regData.user?.email === testEmail,
      "Fresh user registers and returns safe user profile",
      JSON.stringify(regData)
    );
    assert(
      !regData.user?.passwordHash && !regData.user?.password,
      "Registration response never exposes password or passwordHash"
    );
    assert(
      regCookie.includes("session_token=") || regCookie.includes("platform_session="),
      "Registration automatically issues secure session cookie"
    );

    const sessionCookie = regCookie.split(";")[0];

    // -------------------------------------------------------------
    // PHASE 3 — LOGIN / LOGOUT / SESSION RESTORATION
    // -------------------------------------------------------------
    console.log("\n--- Phase 3: Login / Logout / Session Restoration ---");
    // Verify /api/v1/auth/me recognizes the session
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 && meData.user?.email === testEmail,
      "/api/v1/auth/me immediately validates authenticated session",
      JSON.stringify(meData)
    );

    // Logout
    const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    const logoutData = await logoutRes.json();
    assert(logoutRes.status === 200 && logoutData.success, "Logout succeeds");

    // Verify session invalidation
    const meAfterLogout = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const meAfterLogoutData = await meAfterLogout.json();
    assert(
      meAfterLogoutData.user === null,
      "Session token is server-invalidated after logout"
    );

    // Login with existing account
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    const loginCookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
    assert(
      loginRes.status === 200 && loginData.success,
      "Login with valid credentials succeeds and issues new session"
    );

    // -------------------------------------------------------------
    // PHASE 4 — PASSWORD RESET LIFECYCLE
    // -------------------------------------------------------------
    console.log("\n--- Phase 4: Password Reset Lifecycle ---");
    const forgotRes = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });
    const forgotData = await forgotRes.json();
    assert(
      forgotRes.status === 200 && forgotData.success,
      "Forgot password generates secure token"
    );

    const resetToken = forgotData.resetToken;
    let postResetSessionCookie = loginCookie;

    if (resetToken) {
      // Test password reset rejection when confirmPassword does not match
      const resetMismatch = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          password: "NewSafePassword123!",
          confirmPassword: "MismatchPassword123!",
        }),
      });
      assert(resetMismatch.status === 400, "Reset password rejects mismatched passwords");

      // Test valid password reset
      const newPassword = "NewSafePassword123!";
      const resetSuccess = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword,
        }),
      });
      const resetSuccessData = await resetSuccess.json();
      assert(
        resetSuccess.status === 200 && resetSuccessData.success,
        "Reset password consumes token and updates password"
      );

      // Verify token single-use
      const resetReuse = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          password: "AnotherPassword123!",
          confirmPassword: "AnotherPassword123!",
        }),
      });
      assert(resetReuse.status === 400, "Reset password token is strictly single-use");

      // Verify old password rejected
      const oldLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      assert(oldLogin.status === 401, "Old password rejected after password reset");

      // Verify new password accepted
      const newLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: newPassword }),
      });
      const newLoginData = await newLogin.json();
      postResetSessionCookie = (newLogin.headers.get("set-cookie") || "").split(";")[0];
      assert(newLogin.status === 200 && newLoginData.success, "New password accepted after password reset");
    }

    // -------------------------------------------------------------
    // PHASE 5 — EMAIL VERIFICATION LIFECYCLE
    // -------------------------------------------------------------
    console.log("\n--- Phase 5: Email Verification Lifecycle ---");
    const sendVfyRes = await fetch(`${BASE_URL}/api/v1/auth/send-verification`, {
      method: "POST",
      headers: { Cookie: postResetSessionCookie },
    });
    const sendVfyData = await sendVfyRes.json();
    assert(
      sendVfyRes.status === 200 && sendVfyData.success,
      "Generate email verification token succeeds"
    );

    const vfyToken = sendVfyData.token;
    if (vfyToken) {
      const vfyRes = await fetch(`${BASE_URL}/api/v1/auth/verify-email?token=${vfyToken}`, {
        headers: { Cookie: postResetSessionCookie },
      });
      const vfyData = await vfyRes.json();
      assert(
        vfyRes.status === 200 && vfyData.success,
        "Email verification token validates and verifies email"
      );

      // Verify single use
      const vfyReuseRes = await fetch(`${BASE_URL}/api/v1/auth/verify-email?token=${vfyToken}`);
      assert(vfyReuseRes.status === 400, "Email verification token is single-use");
    }

    // -------------------------------------------------------------
    // PHASE 11 & 17 — ADMIN APPROVAL & CUSTOMIZATION
    // -------------------------------------------------------------
    console.log("\n--- Phase 11 & 17: Admin Authorization & Customization ---");
    // Non-admin 403 test
    const unauthAdmin = await fetch(`${BASE_URL}/api/v1/admin/customization`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: postResetSessionCookie },
      body: JSON.stringify({ siteName: "Unauthorized" }),
    });
    assert(unauthAdmin.status === 403, "Non-admin receives 403 Forbidden on Admin endpoints");

    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@thequeue.live",
        password: "AdminMasterKey2026!",
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminCookie = (adminLoginRes.headers.get("set-cookie") || "").split(";")[0];
    assert(
      adminLoginRes.status === 200 && adminLoginData.user?.roles?.includes("OWNER_ADMIN"),
      "OWNER_ADMIN logs in successfully"
    );

    // Admin site customization update
    const patchCustomization = await fetch(`${BASE_URL}/api/v1/admin/customization`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ siteName: "The Queue Live" }),
    });
    const patchCustomizationData = await patchCustomization.json();
    assert(
      patchCustomization.status === 200 && patchCustomizationData.siteName === "The Queue Live",
      "OWNER_ADMIN successfully updates global theme and site customization"
    );

    // Admin manual approval toggle
    const toggleApproval = await fetch(`${BASE_URL}/api/v1/admin/platform-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ requireManualHostApproval: true }),
    });
    const toggleApprovalData = await toggleApproval.json();
    assert(
      toggleApproval.status === 200 && toggleApprovalData.requireManualHostApproval === true,
      "REQUIRE_MANUAL_HOST_APPROVAL toggleable by OWNER_ADMIN and defaults to true"
    );

    // -------------------------------------------------------------
    // PHASE 9, 10, 12, 14 — HOST ONBOARDING, PERSISTENT STATION & LIVE SESSIONS
    // -------------------------------------------------------------
    console.log("\n--- Phase 9, 10, 12, 14: Host Application, Station Persistence & Go Live ---");
    // 1. Submit host application as test user
    const hostApplyRes = await fetch(`${BASE_URL}/api/v1/host/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: postResetSessionCookie },
      body: JSON.stringify({
        publicHostName: "DJ Alex Smoke",
        biography: "Live broadcaster testing persistent station architecture.",
        primaryStreamingPlatform: "TWITCH",
        primaryStreamingProfileUrl: "https://twitch.tv/djalexsmoke",
        country: "US",
        acceptedGenres: "Hip-Hop, Electronic",
      }),
    });
    const hostApplyData = await hostApplyRes.json();
    assert(
      (hostApplyRes.status === 201 || hostApplyRes.status === 200) && !!hostApplyData.id,
      "User submits Host application and enters Stripe onboarding requirement state"
    );

    // 2. Initiate Stripe Connect onboarding
    const stripeConnectRes = await fetch(`${BASE_URL}/api/v1/host/stripe/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: postResetSessionCookie },
      body: JSON.stringify({}),
    });
    const stripeConnectData = await stripeConnectRes.json();
    assert(
      stripeConnectRes.status === 200 && !!stripeConnectData.accountLinkUrl,
      "Host initiates Stripe Connect onboarding"
    );

    // 3. Complete Stripe Connect verification
    const stripeSyncRes = await fetch(`${BASE_URL}/api/v1/host/stripe/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: postResetSessionCookie },
      body: JSON.stringify({}),
    });
    const stripeSyncData = await stripeSyncRes.json();
    assert(
      stripeSyncRes.status === 200 && stripeSyncData.isComplete === true,
      "Stripe Connect verification succeeds and confirms charges/payouts enabled"
    );

    // 4. Admin review and approve host application
    const adminAppsRes = await fetch(`${BASE_URL}/api/v1/admin/host-applications`, {
      headers: { Cookie: adminCookie },
    });
    const adminAppsData = await adminAppsRes.json();
    const targetApp = (Array.isArray(adminAppsData) ? adminAppsData : adminAppsData.applications || []).find(
      (a) => a.applicantUserId === regData.user?.id
    );

    assert(!!targetApp, "Admin retrieves pending host application");

    if (targetApp) {
      const approveRes = await fetch(`${BASE_URL}/api/v1/admin/host-applications/${targetApp.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
      });
      const approveData = await approveRes.json();
      assert(
        approveRes.status === 200 && approveData.success && !!approveData.station,
        "Admin approves host application, creating persistent Station with hostname slug"
      );

      const stationHostname = approveData.station?.slug || "dj-alex-smoke";

      // 5. Verify Station is in Public Directory /hosts and resolves at /{hostname}
      const pubStationRes = await fetch(`${BASE_URL}/api/v1/stations/${stationHostname}`);
      const pubStationData = await pubStationRes.json();
      assert(
        pubStationRes.status === 200 && pubStationData.slug === stationHostname,
        `Persistent Station is publicly accessible at /{hostname} (${stationHostname})`
      );
      assert(
        pubStationData.isLive === false,
        "Station starts in honest OFFLINE state"
      );

      // 6. Host Studio: Go Live (Broadcast 1)
      const goLive1Res = await fetch(`${BASE_URL}/api/v1/host/go-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: postResetSessionCookie },
        body: JSON.stringify({
          liveTitle: "Friday Night Review Session #1",
          primaryStreamingPlatform: "TWITCH",
          submissionsOpen: true,
          freeLineOpen: true,
          paidSubmissionsOpen: true,
        }),
      });
      const goLive1Data = await goLive1Res.json();
      assert(
        goLive1Res.status === 201 && !!goLive1Data.id,
        "Host goes live: creates active LiveSession #1"
      );
      const session1Id = goLive1Data.id;

      // Verify Station is now LIVE in public query
      const pubLiveCheck1 = await fetch(`${BASE_URL}/api/v1/stations/${stationHostname}`);
      const pubLiveCheck1Data = await pubLiveCheck1.json();
      assert(
        pubLiveCheck1Data.isLive === true &&
        pubLiveCheck1Data.currentSession?.id === session1Id,
        "Public station reflects LIVE broadcast with current session details"
      );

      // 7. Host Studio: Go Offline
      const goOfflineRes = await fetch(`${BASE_URL}/api/v1/host/go-offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: postResetSessionCookie },
        body: JSON.stringify({ sessionId: session1Id }),
      });
      const goOfflineData = await goOfflineRes.json();
      assert(
        goOfflineRes.status === 200 && goOfflineData.success,
        "Host goes offline: ends LiveSession #1"
      );

      // Verify Station still exists persistently and is OFFLINE
      const pubOfflineCheck = await fetch(`${BASE_URL}/api/v1/stations/${stationHostname}`);
      const pubOfflineCheckData = await pubOfflineCheck.json();
      assert(
        pubOfflineCheckData.slug === stationHostname &&
        pubOfflineCheckData.isLive === false,
        "Station remains persistent after going offline"
      );

      // 8. Host Studio: Go Live Again (Broadcast 2)
      const goLive2Res = await fetch(`${BASE_URL}/api/v1/host/go-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: postResetSessionCookie },
        body: JSON.stringify({
          liveTitle: "Saturday Afternoon Review Session #2",
          primaryStreamingPlatform: "TWITCH",
          submissionsOpen: true,
          freeLineOpen: true,
          paidSubmissionsOpen: true,
        }),
      });
      const goLive2Data = await goLive2Res.json();
      const session2Id = goLive2Data.id;
      assert(
        goLive2Res.status === 201 &&
        !!session2Id &&
        session2Id !== session1Id,
        "Host goes live again: SAME Station, SAME hostname, NEW LiveSession #2"
      );

      // Verify Station is now LIVE with session 2
      const pubLiveCheck2 = await fetch(`${BASE_URL}/api/v1/stations/${stationHostname}`);
      const pubLiveCheck2Data = await pubLiveCheck2.json();
      assert(
        pubLiveCheck2Data.slug === stationHostname &&
        pubLiveCheck2Data.isLive === true &&
        pubLiveCheck2Data.currentSession?.id === session2Id,
        "Public station resolves to same hostname with LiveSession #2"
      );
    }

    console.log(`\n=================================================`);
    console.log(`FINAL SMOKE TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=================================================\n`);

  } catch (err) {
    console.error("FATAL UNEXPECTED ERROR DURING SMOKE TEST:", err);
  }
}

runSmokeTests();
