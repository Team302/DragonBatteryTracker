#!/bin/sh
set -e

echo "Running database migrations..."
# Log database connection info (with credentials masked) to help with debugging
MASKED_URL=$(echo "$DATABASE_URL" | sed 's|://[^@]*@|://***:***@|')
echo "Connecting to: $MASKED_URL"
alembic upgrade head

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
