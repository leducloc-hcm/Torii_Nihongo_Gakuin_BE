return {
  name = "jwt-validator",
  fields = {
    {
      config = {
        type = "record",
        fields = {
          {
            secret = {
              type = "string",
              required = false,
              description = "JWT secret key for token validation. If not provided, will use JWT_SECRET environment variable."
            }
          },
          {
            skip_on_methods = {
              type = "array",
              elements = { type = "string" },
              required = false,
              description = "HTTP methods to skip JWT validation (e.g., GET, OPTIONS)"
            }
          }
        }
      }
    }
  }
}
