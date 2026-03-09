FROM node:22-alpine

RUN apk add --no-cache libc6-compat

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run prisma:generate
RUN pnpm run build

RUN chown -R app:app /app

USER app

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "run", "start"]
