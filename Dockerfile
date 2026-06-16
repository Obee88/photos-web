# ---- build stage ----
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
# VITE_API_URL is intentionally NOT set here — the runtime entrypoint writes
# config.js from the API_URL env var instead, so one image works everywhere.
RUN pnpm build

# ---- runtime stage ----
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD wget -qO- http://localhost:80/healthz || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
