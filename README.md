# TrustLoop

TrustLoop is a SaaS MVP for **AI software companies** that need to operate customer-facing AI incidents end-to-end.

It provides:
- incident intake and status workflow
- AI-assisted triage (severity/category/next steps)
- AI-generated customer update drafts
- workspace-level encrypted API key management (OpenAI, Gemini, Anthropic)
- LocalStack-backed reminder queue + worker for stale incidents

## Stack
- Next.js 16 (App Router)
- Prisma + SQLite (local)
- AWS SDK v3 (SQS)
- LocalStack (local AWS emulation)

## Security model for provider keys
- keys are entered in-app and sent to server routes only
- keys are encrypted at rest using AES-256-GCM (`KEY_ENCRYPTION_SECRET`)
- full keys are never returned after save (only last4 shown)
- key usage is server-side only for AI workflows
- keys are never logged by app code

## Quick start
1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Run migrations:

```bash
npx prisma migrate dev --name init
```

4. Seed demo workspace and user:

```bash
npm run db:seed
```

5. Start app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo login
- email: `demo@trustloop.local`
- password: `demo12345`

## LocalStack reminder queue (optional but recommended)
1. Start LocalStack:

```bash
docker compose -f docker-compose.localstack.yml up -d
```

2. Initialize queue:

```bash
npm run localstack:init
```

3. Run reminder worker:

```bash
npm run worker
```

4. Stop LocalStack:

```bash
docker compose -f docker-compose.localstack.yml down
```

## Key scripts
- `npm run dev` - run app
- `npm run lint` - lint checks
- `npm run build` - production build check
- `npm run db:seed` - seed demo data
- `npm run localstack:init` - create/check reminder queue
- `npm run worker` - consume reminder queue

## Core routes
- UI: `/dashboard`, `/incidents/[id]`, `/settings`, `/login`, `/register`
- APIs:
  - `/api/auth/*`
  - `/api/incidents/*`
  - `/api/settings/ai-keys`
  - `/api/settings/workflows`
  - `/api/automation/enqueue-reminders`
