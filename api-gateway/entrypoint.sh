#!/bin/sh

# Replace environment variables in kong.yml
if [ -f /usr/local/kong/kong.yml ]; then
  # Replace REDIS_PASSWORD in kong.yml if provided (new nested format)
  if [ -n "$REDIS_PASSWORD" ]; then
    sed -i "s/password: \"\"/password: \"$REDIS_PASSWORD\"/g" /usr/local/kong/kong.yml
  fi
fi

# Start Kong (this daemonizes), then keep container alive by tailing logs
kong start

# Follow logs (Kong writes to these by default in container)
touch /usr/local/kong/logs/error.log /usr/local/kong/logs/access.log 2>/dev/null || true
exec tail -n 0 -F /usr/local/kong/logs/error.log /usr/local/kong/logs/access.log