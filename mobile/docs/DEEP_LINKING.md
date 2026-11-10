# LifeAdmin Mobile — Native Password Reset Deep Linking (Phase 2.1)

This document provides the architecture, configuration instructions, verification procedures, and deployment requirements for LifeAdmin native Android App Links and development custom schemes.

---

## 1. Architecture Overview

Password reset in LifeAdmin operates on a **universal HTTPS URL pattern** designed to serve web users, desktop browsers, and mobile devices:

```
https://lifeadmin.app/reset-password?token=<RESET_TOKEN>
```

When a user requests a password reset from the LifeAdmin website or mobile application:
1. The centralized backend service (`server/src/services/passwordResetUrl.ts`) embeds an HTTPS reset URL into the email.
2. If opened on **desktop** or if the app is **not installed**, the URL opens the existing web application (`/reset-password?token=...`).
3. If opened on **Android with LifeAdmin installed**, Android OS intercepts the HTTPS domain and launches the native LifeAdmin app directly into `ResetPasswordScreen`, pre-filling the reset token.
4. For local testing without domain verification, the custom scheme `lifeadmin://reset-password?token=<RESET_TOKEN>` is also supported.

---

## 2. Android App Links Configuration

### A. Android Package Identifier
- **Package Name**: `com.lifeadmin.app`
- Configured in `mobile/app.json`:
  ```json
  "android": {
    "package": "com.lifeadmin.app",
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "lifeadmin.app",
            "pathPrefix": "/reset-password"
          }
        ],
        "category": [
          "BROWSABLE",
          "DEFAULT"
        ]
      }
    ]
  }
  ```

### B. HTTPS Domain Requirement
- The intent filter specifies `host: "lifeadmin.app"`.
- In production, Android verifies domain ownership by requesting:
  ```
  GET https://lifeadmin.app/.well-known/assetlinks.json
  ```
  *(HTTP 200, Content-Type: `application/json`)*.

---

## 3. Digital Asset Links (`assetlinks.json`) Setup

A template file is provided at [`mobile/assetlinks.json.template`](../assetlinks.json.template).

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.lifeadmin.app",
      "sha256_cert_fingerprints": [
        "PASTE_YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

### Obtaining the SHA-256 Fingerprint

#### Method 1: Google Play App Signing (Production)
1. Go to the **Google Play Console** -> Select your app.
2. Navigate to **Release** > **Setup** > **App Integrity**.
3. Under **App Signing**, locate the **App signing key certificate**.
4. Copy the **SHA-256 certificate fingerprint**.

#### Method 2: Local Keystore / EAS Credentials (Development / Staging Builds)
Run `keytool` on your upload keystore:
```bash
keytool -list -v -keystore <your-release-key.keystore> -alias <key-alias>
```
Look for `Certificate fingerprints:` -> `SHA256: 14:6D:E9:...`.

> [!IMPORTANT]
> Domain verification will only succeed on an Android device once `assetlinks.json` is served over HTTPS from the live domain matching the exact signing certificate of the installed APK/AAB.

---

## 4. Understanding Build Environments

| Environment | HTTPS Android App Links (`autoVerify: true`) | Custom Scheme (`lifeadmin://`) | Notes |
| :--- | :---: | :---: | :--- |
| **Expo Go** | ❌ Not Supported | ⚠️ Limited (`exp://...`) | Expo Go lacks native intent-filters for custom domains. Verified links cannot be tested here. |
| **Development Build** (`npx expo run:android`) | ⚠️ Requires test domain or custom scheme | ✅ Fully Supported | Native Android container with custom scheme and intent filters enabled. |
| **Production APK / AAB** | ✅ Fully Supported | ✅ Fully Supported | Android OS verifies `assetlinks.json` upon installation and opens links seamlessly. |

---

## 5. Development & Device Testing Guide

### A. Testing Custom Scheme via ADB (Development Build / Emulator)

With an Android emulator running or a physical device connected via USB with USB debugging enabled:

```bash
# 1. Test cold start (app completely closed)
adb shell am start -W -a android.intent.action.VIEW -d "lifeadmin://reset-password?token=TEST_TOKEN_123" com.lifeadmin.app

# 2. Test while app is running in background or foreground
adb shell am start -a android.intent.action.VIEW -d "lifeadmin://reset-password?token=TEST_TOKEN_456" com.lifeadmin.app
```

### B. Testing Verified HTTPS App Links via ADB

Android allows simulating verified App Links on test devices without waiting for Play Store deployment:

```bash
# Verify intent filter resolution
adb shell am start -a android.intent.action.VIEW -d "https://lifeadmin.app/reset-password?token=TEST_HTTPS_TOKEN" com.lifeadmin.app

# Check domain verification status on Android 12+
adb shell pm get-app-links com.lifeadmin.app

# Manually approve domain verification for local testing on Android 12+
adb shell pm set-app-links --package com.lifeadmin.app 2 lifeadmin.app
```

---

## 6. Manual Verification Scenarios

### Scenario 1: App Installed and Open (Foreground / Background)
1. Launch LifeAdmin on device.
2. Send a reset email or trigger ADB deep link.
3. Tap the link in your email client or execute ADB command.
4. **Expected**: LifeAdmin is brought to the foreground, switches to `ResetPasswordScreen`, and pre-fills the token into the input field. Duplicate deliveries do not cause screen flashing.

### Scenario 2: App Installed but Closed (Cold Start)
1. Force close LifeAdmin from recent apps.
2. Tap the reset link or run `adb shell am start -W ...`.
3. **Expected**: LifeAdmin cold-starts, boots past the splash screen, and renders `ResetPasswordScreen` with the token pre-filled.

### Scenario 3: App Not Installed (Web Fallback)
1. Open the reset link on a device that does not have LifeAdmin installed.
2. **Expected**: The link opens in Chrome/browser at `https://lifeadmin.app/reset-password?token=...`, showing the web password reset page.

### Scenario 4: Desktop Browser
1. Open the reset link in a desktop browser.
2. **Expected**: Renders web ResetPasswordPage seamlessly.

### Scenario 5: Invalid or Expired Reset Token
1. Open a reset link with an expired or consumed token (`?token=EXPIRED_123`).
2. Submit a new password.
3. **Expected**: The backend rejects the token with a 400 error. The app displays the error banner: *"Failed to reset password. The token may be invalid or expired."* with a clickable link to *"Request a fresh reset link &rarr;"*.

