FROM kong:latest

# Install required Lua dependencies
USER root

# Detect OS and install packages accordingly
RUN if [ -f /etc/alpine-release ]; then \
      apk add --no-cache git unzip sed curl wget; \
    else \
      apt-get update && apt-get install -y git unzip sed curl wget && rm -rf /var/lib/apt/lists/*; \
    fi

# Install lua-resty-jwt for JWT validation
# Configure luarocks to use curl for downloads and install the package
RUN luarocks config variables.OPENSSL_LIBDIR /usr/local/openresty/openssl/lib && \
    luarocks config variables.OPENSSL_INCDIR /usr/local/openresty/openssl/include && \
    luarocks install lua-resty-jwt 2>&1 || \
    (curl -L https://github.com/cdbattaglia/lua-resty-jwt/archive/master.zip -o /tmp/jwt.zip && \
     unzip -q /tmp/jwt.zip -d /tmp && \
     cp -r /tmp/lua-resty-jwt-master/lib/resty /usr/local/share/lua/5.1/ && \
     rm -rf /tmp/jwt.zip /tmp/lua-resty-jwt-master)

# Copy custom plugins
COPY kong/plugins /usr/local/share/lua/5.1/kong/plugins

# Copy Kong configuration
COPY kong.yml /usr/local/kong/kong.yml

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && \
  chmod +x /usr/local/bin/entrypoint.sh

# Set environment variables
ENV KONG_DATABASE=off
ENV KONG_DECLARATIVE_CONFIG=/usr/local/kong/kong.yml
ENV KONG_PROXY_ACCESS_LOG=/dev/stdout
ENV KONG_ADMIN_ACCESS_LOG=/dev/stdout
ENV KONG_PROXY_ERROR_LOG=/dev/stderr
ENV KONG_ADMIN_ERROR_LOG=/dev/stderr
ENV KONG_ADMIN_LISTEN=0.0.0.0:8001
ENV KONG_PROXY_LISTEN=0.0.0.0:8000
ENV KONG_PLUGINS=bundled,jwt-validator

# Expose Kong ports
EXPOSE 8000 8443 8001 8444

# Use custom entrypoint via sh to avoid interpreter issues
ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]