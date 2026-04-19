# Multi-stage build for Next.js App Router with `output: 'standalone'`.
# - deps:   install exact dependency graph from the lockfile
# - build:  produce .next/standalone + .next/static + public
# - runner: minimal runtime image containing only what `server.js` loads

FROM node:20-slim AS deps
WORKDIR /web
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

FROM node:20-slim AS build
WORKDIR /web
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /web/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /web
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Drop privileges — Next.js's standalone `server.js` has no reason to run
# as root. The `node` user ships in the official node image.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Copy only what `server.js` needs — no build tooling, no source maps, no npm.
COPY --from=build --chown=nextjs:nodejs /web/public ./public
COPY --from=build --chown=nextjs:nodejs /web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /web/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=5 \
    CMD node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
