# syntax=docker/dockerfile:1

# The image is built *from* `.env.production`, not merely run with it.
# `next build` inlines every `NEXT_PUBLIC_*` value into the browser bundle and
# freezes two things from `next.config.ts` into the build output: the image host
# allow-list and the destination of the `/api/*` rewrite. So the file has to be
# in the build context, and the image has to be rebuilt when it changes.
# `.dockerignore` lets exactly that one env file through and keeps `.env.local`
# out — it outranks `.env.production` in Next's precedence and would otherwise
# quietly win inside the image.

FROM node:22-alpine AS base
# Alpine ships musl; the prebuilt binaries Next and sharp resolve at install
# time expect a glibc-compatible loader to be present.
RUN apk add --no-cache libc6-compat
WORKDIR /app


# --- dependencies ------------------------------------------------------------
FROM base AS deps
# `scripts/` comes along because `postinstall` runs `vendor:player` and would
# fail on a missing file.
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci


# --- build -------------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NODE_ENV is `production` for `next build`, which is what makes it read
# `.env.production`.
RUN npm run build


# --- runtime -----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: "standalone"` traces the server and its dependencies into
# `.next/standalone`, which is why no `node_modules` is installed here. It
# deliberately leaves out `public` and `.next/static`, on the assumption a CDN
# serves them; there is none here, so they are copied in and the server does it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Also at runtime: `API_URL` and the timeout are read per request on the server,
# and the standalone server loads `.env*` from its own directory on start.
COPY --from=builder --chown=nextjs:nodejs /app/.env.production ./.env.production

USER nextjs
EXPOSE 3000

# `/` is a middleware redirect to a locale; fetch follows it, so a healthy
# answer means routing and rendering both work.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
