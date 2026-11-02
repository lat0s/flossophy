# syntax=docker/dockerfile:1
# Two images from one build: `--target api` and `--target gate` (gate also serves the web app).

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /src
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/gate/package.json apps/gate/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
# Telemetry is off when these are unset (infra-vps sites/add-telemetry.sh sets them on Coolify).
ARG VITE_UMAMI_ID VITE_UMAMI_SRC VITE_GLITCHTIP_DSN
RUN pnpm --filter @flossophy/api build \
 && pnpm --filter @flossophy/gate build \
 && pnpm --filter @flossophy/web build \
 && pnpm --filter @flossophy/api openapi /src/openapi.json

# argon2 is the only native module the API bundle leaves external.
FROM node:24-alpine AS api-deps
WORKDIR /deps
RUN echo '{"type":"module"}' > package.json && npm install --omit=dev --no-audit --no-fund argon2@0.45.1

FROM node:24-alpine AS api
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=api-deps /deps/node_modules ./node_modules
COPY --from=build /src/apps/api/dist/main.js ./main.js
RUN echo '{"type":"module"}' > package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "main.js"]

FROM node:24-alpine AS gate
ENV NODE_ENV=production PORT=8090 WEB_DIST=/app/web OPENAPI_FILE=/app/openapi.json
WORKDIR /app
COPY --from=build /src/apps/gate/dist/main.js ./main.js
COPY --from=build /src/apps/web/dist ./web
COPY --from=build /src/openapi.json ./openapi.json
RUN echo '{"type":"module"}' > package.json
USER node
EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:8090/gate/status || exit 1
CMD ["node", "main.js"]
