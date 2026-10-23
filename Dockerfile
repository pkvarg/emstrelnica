FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_HONO_API_URL
ARG NEXT_PUBLIC_EMAIL_EXTRA_ONE
ARG NEXT_PUBLIC_EMAIL_EXTRA_TWO
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_HONO_API_URL=${NEXT_PUBLIC_HONO_API_URL} \
    NEXT_PUBLIC_EMAIL_EXTRA_ONE=${NEXT_PUBLIC_EMAIL_EXTRA_ONE} \
    NEXT_PUBLIC_EMAIL_EXTRA_TWO=${NEXT_PUBLIC_EMAIL_EXTRA_TWO}
RUN pnpm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Europe/Bratislava

RUN apt-get update && apt-get install -y --no-install-recommends tzdata \
  && ln -sf /usr/share/zoneinfo/Europe/Bratislava /etc/localtime \
  && echo "Europe/Bratislava" > /etc/timezone \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 5001
ENV PORT=5001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
