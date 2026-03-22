FROM node:20-alpine AS builder

# Set Node.js memory options for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nestjs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (including @prisma/client)
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma

# Generate Prisma Client in production stage (needed for runtime)
# This must run after copying prisma schema and installing @prisma/client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Fix ownership of Prisma Client files (generated as root, need to be accessible by nestjs user)
RUN chown -R nestjs:nestjs node_modules/.prisma node_modules/@prisma

# Create logs directory (as root before switching user)
RUN mkdir -p logs && chown nestjs:nestjs logs

# Switch to non-root user
USER nestjs

# Expose the application port
EXPOSE 4003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["node", "dist/src/main.js"]

