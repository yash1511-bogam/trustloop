# Missing Features Implementation TODO

Status legend:
- `[ ]` pending
- `[-]` in progress
- `[x]` implemented

## Foundation
- [-] Add schema support for audit logs, customer update approvals, tags, templates, SLA policy, maintenance windows, outbound webhooks, workspace memberships, and scoped API keys.
- [ ] Add shared audit logging helpers and instrument privileged actions.
- [ ] Add rate-limit headers on successful API responses.
- [ ] Add a health check endpoint for infrastructure monitoring.

## Incident Workflow
- [ ] Deliver approved customer updates to the incident `customerEmail`.
- [ ] Add draft, submit, approve, reject, and publish states for customer updates.
- [ ] Add bulk incident operations.
- [ ] Add duplicate detection for manual and API-created incidents.
- [ ] Add SLA tracking, breach detection, and time-to-first-response timestamps.
- [ ] Add incident templates.
- [ ] Add free-form tags / labels.
- [ ] Add CSV / bulk import.
- [ ] Add real-time dashboard refresh.
- [ ] Add priority auto-escalation from P2 to P1.

## Workspace / Admin
- [ ] Allow workspace rename.
- [ ] Allow workspace deletion.
- [ ] Add Slack disconnect.
- [ ] Add workspace-level audit log UI/API.
- [ ] Add multi-workspace memberships and workspace switching.
- [ ] Add scheduled maintenance windows to the public status page.
- [ ] Add scoped API keys with optional IP allowlists.

## Integrations / Platform
- [ ] Add outbound webhooks for incident lifecycle events.
- [ ] Add OpenAPI documentation.
- [ ] Add an automated test suite.
