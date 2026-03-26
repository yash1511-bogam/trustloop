# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build the application ───────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholders — real values injected at runtime via ECS + Secrets Manager.
# ARG (not ENV) so these don't persist in the final image layer.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ARG REDIS_URL="redis://localhost:6379"
ARG STYTCH_PROJECT_ID="build"
ARG STYTCH_SECRET="build"
ARG STYTCH_ENV="test"
ARG KEY_ENCRYPTION_SECRET="build-placeholder-key-encryption-32ch"
ARG RESEND_API_KEY="re_build"
ARG RESEND_FROM_EMAIL="build@example.com"
ARG DODO_PAYMENTS_API_KEY="build"
ARG DODO_PAYMENTS_WEBHOOK_KEY="build"
ARG DODO_PAYMENTS_ENV="test_mode"
ARG DODO_PRODUCT_ID_STARTER="build"
ARG DODO_PRODUCT_ID_PRO="build"
ARG DODO_PRODUCT_ID_ENTERPRISE="build"
ARG BILLING_AUTOMATION_CRON_SECRET="build"
ARG REMINDER_ENQUEUE_CRON_SECRET="build"
ARG AI_KEY_HEALTH_CRON_SECRET="build"
ARG REMINDER_STALE_MINUTES="240"
ARG AWS_REGION="us-east-1"
ARG REMINDER_QUEUE_NAME="build"
ARG REMINDER_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/000000000000/build"

RUN pnpm run prisma:generate
RUN pnpm run build

# Create a self-contained prisma CLI install for migrations in the runner.
# npm (not pnpm) produces a flat node_modules that survives Docker COPY.
RUN PRISMA_VER=$(node -e "console.log(require('./node_modules/prisma/package.json').version)") && \
    mkdir /prisma-cli && cd /prisma-cli && \
    echo "{\"dependencies\":{\"prisma\":\"$PRISMA_VER\"}}" > package.json && \
    npm install --omit=dev && \
    cp -r /app/prisma /prisma-cli/prisma && \
    cp /app/prisma.config.ts /prisma-cli/prisma.config.ts

# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /prisma-cli /prisma-cli

RUN chown -R app:app /app
USER app

EXPOSE 3000
CMD ["node", "server.js"]
