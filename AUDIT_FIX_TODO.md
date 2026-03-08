# TrustLoop v3 Audit Fix TODO

## Goal
Implement remaining high-priority fixes from `../TrustLoop-v3-Audit.md` with production-safe logic and no hardcoded shortcuts.

## Todo List
- [x] 1. Webhook hardening + logging
  - [x] Add shared helper for webhook ingestion lifecycle (parse, dedup, quota, create, refresh, structured logging)
  - [x] Remove silent `.catch(() => null)` from all six webhook routes
  - [x] Ensure invalid JSON and create failures return deterministic HTTP responses with logs
- [x] 2. Billing logging hardening
  - [x] Add structured billing logs for dedup/ignored/processed paths
  - [x] Replace silent email/SDK failure catches with contextual `log.billing.*`
  - [x] Log automation outcomes in `processPastDueBillingAutomation`
- [x] 3. Reminder runner logging hardening
  - [x] Replace silent SMS send catches with `log.worker.error`
  - [x] Add lifecycle logs around queue/defer/send/fail paths
- [x] 4. Logger deployment mode
  - [x] Add `LOG_MODE` env support: `auto` (default), `file`, `console`
  - [x] Skip file stream setup cleanly when mode resolves to console
  - [x] Document behavior in `.env.example` and `README.md`
- [x] 5. Docs search enablement
  - [x] Add Fumadocs/Orama search route
  - [x] Enable docs search in layout/provider
- [x] 6. Product-facing docs content
  - [x] Add webhook integration guide
  - [x] Add API key auth guide
  - [x] Add incident workflow guide
  - [x] Add billing and plan limits reference
  - [x] Link guides in docs metadata
- [x] 7. Silent side-effect failure hardening (extra audit pass)
  - [x] Replace silent Slack post/modal catches with contextual logs
  - [x] Replace silent invite/owner email catches with contextual logs
  - [x] Replace silent auth onboarding email catches with contextual logs
  - [x] Replace silent AI key health alert catches in route + script
- [x] 8. Verification
  - [x] Run `pnpm lint`
  - [x] Run `pnpm build`
  - [x] Fix any regressions found by checks
