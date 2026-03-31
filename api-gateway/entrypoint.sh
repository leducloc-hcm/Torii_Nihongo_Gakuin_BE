#!/bin/sh
set -e

# Replace environment variables in kong.yml for ECS service discovery
if [ -f /usr/local/kong/kong.yml ]; then
  # Replace service hostnames with ECS service discovery names
  # In docker-compose, these are container names (e.g., learning-service)
  # In ECS, these are service discovery DNS names (e.g., learning-service.torii-nihongo-gakuin.local)
  if [ -n "$LEARNING_SERVICE_HOST" ]; then
    sed -i "s|http://learning-service:|http://${LEARNING_SERVICE_HOST}:|g" /usr/local/kong/kong.yml
  fi

  if [ -n "$ASSESSMENT_SERVICE_HOST" ]; then
    sed -i "s|http://assessment-service:|http://${ASSESSMENT_SERVICE_HOST}:|g" /usr/local/kong/kong.yml
  fi

  if [ -n "$GAMIFICATION_SERVICE_HOST" ]; then
    sed -i "s|http://gamification-service:|http://${GAMIFICATION_SERVICE_HOST}:|g" /usr/local/kong/kong.yml
  fi

  if [ -n "$API_DOCS_HOST" ]; then
    sed -i "s|http://api-docs:|http://${API_DOCS_HOST}:|g" /usr/local/kong/kong.yml
  fi

  # Replace Redis hostname for rate-limiting plugin
  if [ -n "$REDIS_ECS_HOST" ]; then
    sed -i "s|host: redis|host: ${REDIS_ECS_HOST}|g" /usr/local/kong/kong.yml
  fi

  # Replace REDIS_PASSWORD in kong.yml if provided
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