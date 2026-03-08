# TrustLoop v3 Audit Fix TODO

## Goal
Implement remaining high-priority fixes from `../TrustLoop-v3-Audit.md` with production-safe logic and no hardcoded shortcuts.

## Todo List
- [ ] 1. Webhook hardening + logging
  - [ ] Add shared helper for webhook ingestion lifecycle (parse, dedup, quota, create, refresh, structured logging)
  - [ ] Remove silent `.catch(() => null)` from all six webhook routes
  - [ ] Ensure invalid JSON and create failures return deterministic HTTP responses with logs
- [ ] 2. Billing logging hardening
  - [ ] Add structured billing logs for dedup/ignored/processed paths
  - [ ] Replace silent email/SDK failure catches with contextual `log.billing.*`
  - [ ] Log automation outcomes in `processPastDueBillingAutomation`
- [ ] 3. Reminder runner logging hardening
  - [ ] Replace silent SMS send catches with `log.worker.error`
  - [ ] Add lifecycle logs around queue/defer/send/fail paths
- [ ] 4. Logger deployment mode
  - [ ] Add `LOG_MODE` env support: `auto` (default), `file`, `console`
  - [ ] Skip file stream setup cleanly when mode resolves to console
  - [ ] Document behavior in `.env.example` and `README.md`
- [ ] 5. Docs search enablement
  - [ ] Add Fumadocs/Orama search route
  - [ ] Enable docs search in layout/provider
- [ ] 6. Product-facing docs content
  - [ ] Add webhook integration guide
  - [ ] Add API key auth guide
  - [ ] Add incident workflow guide
  - [ ] Add billing and plan limits reference
  - [ ] Link guides in docs metadata
- [ ] 7. Verification
  - [ ] Run `pnpm lint`
  - [ ] Run `pnpm build`
  - [ ] Fix any regressions found by checks
