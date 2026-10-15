# =========================================================================
# Multi-stage Dockerfile for Metacognitive Testing System (Bun + Hono)
# =========================================================================

# Stage 1: Build frontend assets
FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY package.json bun.lock tsconfig.json vite.config.ts ./
RUN bun install --frozen-lockfile

COPY src/ ./src/
COPY index.ts ./
RUN bun run build

# Stage 2: Lightweight production runner
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

COPY package.json bun.lock tsconfig.json ./
RUN bun install --production --frozen-lockfile

COPY src/backend/ ./src/backend/
COPY --from=builder /app/dist/ ./dist/

# Ensure sqlite data directory exists
RUN mkdir -p /app/data

EXPOSE 8000

VOLUME ["/app/data"]

CMD ["bun", "src/backend/server.ts"]
