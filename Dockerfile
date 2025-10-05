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
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Set environment to production
ENV NODE_ENV=production

ENV DATABASE_URL="postgresql://postgres:nhatngutorii@torii-nihongo-db.ct64ww6csug1.ap-southeast-1.rds.amazonaws.com:5432/postgres?schema=public"
ENV ACCESS_TOKEN_SECRET='nhatngutorii'
ENV ACCESS_TOKEN_EXPIRES_IN=1h
ENV REFRESH_TOKEN_SECRET='nhatngutorii'
ENV REFRESH_TOKEN_EXPIRES_IN=1d
ENV PORT=4000

ENV SECRET_API_KEY=toriinihongogakuin
ENV PAYMENT_API_KEY=

ENV ADMIN_NAME=
ENV ADMIN_PASSWORD=
ENV ADMIN_EMAIL=
ENV ADMIN_PHONE_NUMBER=
ENV OTP_EXPIRES_IN=5m
ENV RESEND_API_KEY='d641b1cb-6bd3-4d71-a1b2-23eee1afb66a'
ENV RESEND_FROM_ADDRESS='noreply@develop.torii-nihongo-gakuin.io.vn'
ENV GOOGLE_CLIENT_ID=
ENV GOOGLE_CLIENT_SECRET=
ENV GOOGLE_REDIRECT_URI=
ENV GOOGLE_CLIENT_REDIRECT_URI=
ENV APP_NAME=
ENV PREFIX_STATIC_ENPOINT=

ENV S3_REGION='ap-southeast-1'
ENV S3_ACCESS_KEY='AKIAVVZPCSCKZAVMUOVN'
ENV S3_SECRET_KEY='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'
ENV S3_BUCKET_NAME='torii-nihongo-gakuin-s3'
ENV REDIS_URL='redis://default:password@localhost:6379'

# Start the application
CMD ["node", "dist/src/main.js"]
