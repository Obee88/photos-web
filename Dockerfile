# ---- build stage ----
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- runtime stage ----
FROM nginx:1.27-alpine

# Non-root: nginx official image already supports running as non-root on port 8080
# We'll use the default nginx user
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback — all routes serve index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
