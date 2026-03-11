#!/bin/sh
set -e

echo "Running database migrations..."
# show the URL to make debugging connection problems easier; the value
# comes from the environment and should point at the `db` service when
# running under Docker.
echo "DATABASE_URL=$DATABASE_URL"
alembic upgrade head

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
