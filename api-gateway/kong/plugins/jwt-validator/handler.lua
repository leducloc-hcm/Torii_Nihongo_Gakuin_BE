local jwt = require "resty.jwt"
local cjson = require "cjson"

local JwtValidatorHandler = {
  PRIORITY = 1000,
  VERSION = "1.0.0",
}

-- Public endpoints that don't require JWT validation
local public_paths = {
  ["/auth/login"] = true,
  ["/auth/register"] = true,
  ["/auth/verify"] = true,
  ["/auth/forgot-password"] = true,
  ["/auth/reset-password"] = true,
  ["/auth/google"] = true,
  ["/auth/google/callback"] = true,
  ["/health"] = true,
  ["/actuator"] = true,
}

local function is_public_endpoint(path)
  for public_path, _ in pairs(public_paths) do
    if path:match("^" .. public_path) then
      return true
    end
  end
  return false
end

function JwtValidatorHandler:access(conf)
  local path = kong.request.get_path()
  
  -- Skip validation for public endpoints
  if is_public_endpoint(path) then
    return
  end
  
  -- Get JWT secret from environment or config
  -- Kong provides access to environment variables through kong.configuration
  local jwt_secret = conf.secret
  if not jwt_secret or jwt_secret == "" then
    -- Try to get from environment variable
    local env_secret = os.getenv("JWT_SECRET")
    if env_secret and env_secret ~= "" then
      jwt_secret = env_secret
    else
      jwt_secret = "nhatngutorii"  -- fallback (should be set via env)
    end
  end
  
  -- Extract token from Authorization header
  local auth_header = kong.request.get_header("Authorization")
  if not auth_header then
    return kong.response.exit(401, {
      error = "Missing authorization header",
      status = 401
    }, {
      ["Content-Type"] = "application/json"
    })
  end
  
  local token = auth_header:match("Bearer%s+(.+)")
  if not token then
    return kong.response.exit(401, {
      error = "Invalid authorization header format",
      status = 401
    }, {
      ["Content-Type"] = "application/json"
    })
  end
  
  -- Validate JWT token
  local jwt_obj = jwt:verify(jwt_secret, token)
  
  if not jwt_obj or not jwt_obj.valid then
    local reason = jwt_obj and jwt_obj.reason or "unknown error"
    kong.log.err("JWT validation failed: ", reason)
    return kong.response.exit(401, {
      error = "Invalid token",
      status = 401
    }, {
      ["Content-Type"] = "application/json"
    })
  end
  
  local claims = jwt_obj.payload or {}
  
  -- Extract user information from claims
  local user_id = claims.userId or claims.sub
  local user_email = claims.email or claims.sub
  local user_role = claims.role or "user"
  
  -- Add user info to request headers for downstream services
  kong.service.request.set_header("X-User-Id", tostring(user_id))
  kong.service.request.set_header("X-User-Email", user_email)
  kong.service.request.set_header("X-User-Role", user_role)
  
  -- Log successful authentication
  kong.log.info("JWT validated successfully for user: ", user_id)
end

return JwtValidatorHandler
