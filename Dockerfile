# ===================================
# Stage 1: Dependencies
# ===================================
FROM node:20-alpine AS deps

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm ci --only=production

# Copy Prisma schema for production deps
COPY prisma ./prisma/

# Generate Prisma Client in production node_modules
RUN npx prisma generate

# Clean npm cache
RUN npm cache clean --force

# ===================================
# Stage 2: Builder
# ===================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source
COPY . .

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Build email templates (if needed)
RUN npm run email:build || true

# ===================================
# Stage 3: Runner (Production)
# ===================================
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy package.json for running the app
COPY --chown=nestjs:nodejs package.json ./

# Copy email templates and other static assets
COPY --from=builder --chown=nestjs:nodejs /app/emails ./emails
COPY --from=builder --chown=nestjs:nodejs /app/src/shared/email-templates ./src/shared/email-templates

# Create logs directory with proper permissions
RUN mkdir -p logs && chown nestjs:nodejs logs

# Switch to non-root user
USER nestjs

# Expose the application port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/src/main.js"]
