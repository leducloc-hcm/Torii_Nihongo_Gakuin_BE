import { registerAs } from "@nestjs/config";

export default registerAs("redis", () => {
  const tlsEnabled = process.env.REDIS_TLS === "true";

  return {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    url: process.env.REDIS_URL,
    ttl: parseInt(process.env.REDIS_TTL || "3600", 10),
    tls: tlsEnabled ? {} : undefined,
  };
});
