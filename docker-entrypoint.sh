#!/bin/sh
# Generates /usr/share/nginx/html/config.js from environment variables at
# container startup. This lets the same Docker image be pointed at any API
# without a rebuild — just set API_URL in your VPS dashboard.
#
# Usage:
#   API_URL=https://api.photos.example.com docker run photos-web

set -e

CONFIG_FILE=/usr/share/nginx/html/config.js

cat > "$CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  apiUrl: "${API_URL:-}"
};
EOF

echo "[entrypoint] config.js written (apiUrl=${API_URL:-<empty, using same-origin>})"

exec nginx -g "daemon off;"
