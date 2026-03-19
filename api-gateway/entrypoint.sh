#!/bin/sh
set -e

# Replace environment variables in kong.yml
if [ -f /usr/local/kong/kong.yml ]; then
  # Replace REDIS_PASSWORD in kong.yml if provided (new nested format)
  if [ -n "$REDIS_PASSWORD" ]; then
    sed -i "s/password: \"\"/password: \"$REDIS_PASSWORD\"/g" /usr/local/kong/kong.yml
  fi
fi

# Ensure log directory and files exist before tailing
mkdir -p /usr/local/kong/logs
touch /usr/local/kong/logs/error.log /usr/local/kong/logs/access.log

# Start Kong in the foreground so Docker can capture stdout/stderr
# Kong's nginx-based architecture writes to these log files;
# use 'kong start' then wait for readiness, then tail logs.
kong start

# Wait until Kong's proxy port is accepting connections (up to 30s)
TIMEOUT=30
ELAPSED=0
until kong health >/dev/null 2>&1 || [ "$ELAPSED" -ge "$TIMEOUT" ]; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
  echo "ERROR: Kong did not become healthy within ${TIMEOUT}s" >&2
  exit 1
fi

echo "Kong is healthy, following logs..."
# Use exec so the tail process becomes PID 1 and receives OS signals properly
exec tail -n 0 -F /usr/local/kong/logs/error.log /usr/local/kong/logs/access.log