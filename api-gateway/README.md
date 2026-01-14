# Kong API Gateway

This API Gateway has been migrated from Spring Cloud Gateway to Kong with Nginx.

## Architecture

Kong is a cloud-native, platform-agnostic, scalable API Gateway built on top of Nginx. It provides:
- High-performance request routing
- JWT authentication
- Rate limiting
- CORS handling
- Request/response transformation
- Logging and monitoring

## Features

### Current Implementation

1. **JWT Authentication**: Custom JWT validator plugin that validates tokens and extracts user information
2. **Rate Limiting**: Redis-based rate limiting for different endpoints
3. **CORS**: Configured CORS headers for all routes
4. **Request Routing**: Routes requests to:
   - Learning Service (port 4001)
   - Assessment Service (port 4002)

### Routes

#### Learning Service Routes
- `/auth/*` - Authentication endpoints (public, rate limited)
- `/users/*` - User management (JWT protected, rate limited)
- `/profile/*` - User profile (JWT protected, rate limited)
- `/courses/*` - Course management (JWT protected, rate limited)
- `/blogs/*` - Blog endpoints (JWT protected)
- `/flashcards/*` - Flashcard endpoints (JWT protected)
- `/payment/*` - Payment endpoints (JWT protected)
- `/online-class/*` - Online class endpoints (JWT protected)
- `/dashboard/*` - Dashboard endpoints (JWT protected)

#### Assessment Service Routes
- `/assessment/*` - Assessment endpoints (JWT protected)
- `/score-profile/*` - Score profile endpoints (JWT protected)

## Configuration

### Environment Variables

- `JWT_SECRET`: Secret key for JWT token validation (required)
- `REDIS_HOST`: Redis host for rate limiting (default: redis)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)

### Kong Configuration

The Kong configuration is defined in `kong.yml` using declarative configuration. This file defines:
- Services and their upstream URLs
- Routes and path matching
- Plugins (CORS, rate limiting, JWT validation)
- Global plugins

## Custom JWT Validator Plugin

A custom Kong plugin (`jwt-validator`) has been created to validate JWT tokens and extract user information. The plugin:

1. Validates JWT tokens using the configured secret
2. Extracts user information (userId, email, role) from token claims
3. Adds user information to request headers for downstream services
4. Skips validation for public endpoints

### Public Endpoints (No JWT Required)

- `/auth/login`
- `/auth/register`
- `/auth/verify`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/google`
- `/auth/google/callback`
- `/health`
- `/actuator`

## Running the Gateway

### Using Docker Compose

```bash
docker-compose up api-gateway
```

The gateway will be available at:
- Proxy: `http://localhost:8000`
- Admin API: `http://localhost:8001`

### Port Configuration

Default ports:
- `8000`: Kong proxy port (main API endpoint)
- `8001`: Kong admin API port
- `8443`: Kong proxy SSL port

You can override these in `docker-compose.yml` using environment variables:
- `API_GATEWAY_PORT`: Proxy port (default: 8000)
- `API_GATEWAY_ADMIN_PORT`: Admin port (default: 8001)
- `API_GATEWAY_SSL_PORT`: SSL port (default: 8443)

## Migration from Spring Cloud Gateway

### Key Changes

1. **Port Change**: Gateway now runs on port 8000 instead of 8080
2. **Configuration**: Routes are now defined in `kong.yml` instead of `application.yml`
3. **JWT Validation**: Uses custom Kong plugin instead of Spring filter
4. **Rate Limiting**: Uses Kong's rate-limiting plugin with Redis
5. **CORS**: Handled by Kong's CORS plugin

### Backward Compatibility

To maintain backward compatibility with existing clients using port 8080, you can:
1. Update your frontend to use port 8000
2. Add a reverse proxy (Nginx) in front of Kong to listen on port 8080
3. Update the docker-compose port mapping

## Development

### Building the Docker Image

```bash
cd api-gateway
docker build -t torii-api-gateway .
```

### Testing the Gateway

```bash
# Health check
curl http://localhost:8000/health

# Test public endpoint
curl http://localhost:8000/auth/login

# Test protected endpoint (requires JWT)
curl -H "Authorization: Bearer <token>" http://localhost:8000/users
```

### Viewing Kong Logs

```bash
docker logs torii-api-gateway
```

### Accessing Kong Admin API

```bash
# Get all services
curl http://localhost:8001/services

# Get all routes
curl http://localhost:8001/routes

# Get all plugins
curl http://localhost:8001/plugins
```

## Troubleshooting

### JWT Validation Issues

If JWT validation is failing:
1. Check that `JWT_SECRET` environment variable is set correctly
2. Verify the token format: `Bearer <token>`
3. Check Kong logs for detailed error messages

### Rate Limiting Issues

If rate limiting is not working:
1. Verify Redis is running and accessible
2. Check Redis connection settings in `kong.yml`
3. Verify rate limiting plugin is enabled on the route

### Route Not Found

If routes are not matching:
1. Check `kong.yml` for correct path patterns
2. Verify services are running and accessible
3. Check Kong logs for routing errors

## Additional Resources

- [Kong Documentation](https://docs.konghq.com/)
- [Kong Plugin Development](https://docs.konghq.com/gateway/latest/plugin-development/)
- [Kong Declarative Configuration](https://docs.konghq.com/gateway/latest/declarative-config/)
