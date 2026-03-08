# TrustLoop v4 Audit Implementation TODO

## Goal
Implement the remaining deep-audit gaps end-to-end with production-safe logic (no hardcoded shortcuts), and verify with lint/build.

## Checklist
- [x] 1. SAML SSO end-to-end
  - [x] 1.1 Add workspace fields for SAML org/connection linkage
  - [x] 1.2 Add Stytch SAML helpers (support detection, org/session resolution, connection sync, start URL, token auth)
  - [x] 1.3 Wire workspace settings API to sync/update SAML connection metadata safely
  - [x] 1.4 Add auth routes for SAML start + callback
  - [x] 1.5 Add login UI flow and error handling for SAML sign-in

- [x] 2. On-call rotation for P1 escalations
  - [x] 2.1 Add quota fields for rotation enable/interval/anchor
  - [x] 2.2 Expose/save rotation config in settings API + UI
  - [x] 2.3 Apply rotation logic in reminder runner with deterministic recipient selection

- [x] 3. PWA push notifications (real path)
  - [x] 3.1 Add push subscription persistence model
  - [x] 3.2 Add Web Push server utility and secure VAPID configuration
  - [x] 3.3 Add subscribe/unsubscribe/test API routes
  - [x] 3.4 Add push-capable service worker handlers
  - [x] 3.5 Add settings UI to enable/test browser push
  - [x] 3.6 Integrate push sends into reminder escalation workflow

- [x] 4. Reminder scheduler hardening
  - [x] 4.1 Add cron-secret auth mode to enqueue reminders route
  - [x] 4.2 Add Terraform EventBridge schedule + API destination for enqueue automation
  - [x] 4.3 Add corresponding env + docs updates

- [x] 5. Theme support (dark/light)
  - [x] 5.1 Add persisted theme preference (cookie)
  - [x] 5.2 Add theme toggle UI in app shell
  - [x] 5.3 Add light/dark tokenized CSS so both themes render correctly

- [x] 6. Verification
  - [x] 6.1 Run Prisma validation checks
  - [x] 6.2 Run `pnpm lint`
  - [x] 6.3 Run `pnpm build`
  - [x] 6.4 Resolve regressions and mark checklist complete
