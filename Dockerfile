FROM node:22-alpine

RUN apk add --no-cache libc6-compat

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build-time placeholders — real values injected at runtime via ECS + Secrets Manager
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    REDIS_URL="redis://localhost:6379" \
    STYTCH_PROJECT_ID="build" \
    STYTCH_SECRET="build" \
    STYTCH_ENV="test" \
    KEY_ENCRYPTION_SECRET="build-placeholder-key-encryption-32ch" \
    RESEND_API_KEY="re_build" \
    RESEND_FROM_EMAIL="build@example.com" \
    DODO_PAYMENTS_API_KEY="build" \
    DODO_PAYMENTS_WEBHOOK_KEY="build" \
    DODO_PAYMENTS_ENV="test_mode" \
    DODO_PRODUCT_ID_STARTER="build" \
    DODO_PRODUCT_ID_PRO="build" \
    DODO_PRODUCT_ID_ENTERPRISE="build" \
    BILLING_AUTOMATION_CRON_SECRET="build" \
    REMINDER_ENQUEUE_CRON_SECRET="build" \
    AI_KEY_HEALTH_CRON_SECRET="build" \
    REMINDER_STALE_MINUTES="240" \
    AWS_REGION="us-east-1" \
    REMINDER_QUEUE_NAME="build" \
    REMINDER_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/000000000000/build"

RUN pnpm run prisma:generate
RUN pnpm run build

# Clear build-time placeholders
ENV DATABASE_URL="" \
    REDIS_URL="" \
    STYTCH_SECRET="" \
    KEY_ENCRYPTION_SECRET="" \
    RESEND_API_KEY="" \
    DODO_PAYMENTS_API_KEY="" \
    DODO_PAYMENTS_WEBHOOK_KEY=""

RUN chown -R app:app /app

USER app

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "run", "start"]
