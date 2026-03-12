#!/bin/sh
set -eu

# Generate browser-visible runtime config from container env vars.
: "${API_BASE:=/api}"
: "${PUBLIC_HOST:=}"

envsubst '${API_BASE} ${PUBLIC_HOST}' \
  < /usr/share/nginx/html/config.js.template \
  > /usr/share/nginx/html/config.js
