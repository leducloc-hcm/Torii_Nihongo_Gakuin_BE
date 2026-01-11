# ===================================
# Stage 1: Dependencies
# ===================================
FROM node:20-alpine AS deps

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
ENV HUSKY=0
# Install production dependencies
RUN npm pkg delete scripts.prepare && npm ci 

# Copy Prisma schema for production deps
COPY prisma ./prisma/

# Generate Prisma Client in production node_modules
RUN npx prisma generate

# Clean npm cache
RUN npm cache clean --force

# ===================================
# Stage 2: Builder
# ===================================
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the NestJS application
RUN npm run build

# Build email templates (if needed)
RUN npm run email:build || true

RUN npm cache clean --force && rm -rf /root/.npm /tmp/*
# ===================================
# Stage 3: Runner (Production)
# ===================================
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma and openssh-client for SSH to Janus server
RUN apk add --no-cache openssl libc6-compat openssh-client

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

ENV DATABASE_URL="postgresql://postgres:nhatngutorii@db.rkizlomnljifkbdimrup.supabase.co:5432/postgres?schema=public&ipv6=0"
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
ENV RESEND_API_KEY='re_RrB5o6vU_Mvib88FxdRAEXJTMUjNthzwc'
ENV RESEND_FROM_ADDRESS='noreply@torii-nihongo-gakuin.io.vn'

ENV GOOGLE_CLIENT_ID='521002288353-ojkodbhule2bu47eocs445f9r1t87tft.apps.googleusercontent.com'
ENV GOOGLE_CLIENT_SECRET='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'
ENV GOOGLE_REDIRECT_URI='https://develop.torii-nihongo-gakuin.io.vn/auth/google/callback'
ENV GOOGLE_CLIENT_REDIRECT_URI='https://torii-nihongo-gakuin.io.vn/auth/google/callback'
ENV APP_NAME='Torii Nihongo Gakuin'


ENV AWS_ACCESS_KEY_ID='AKIA3AAD56OYHIFM7AMW'
ENV AWS_SECRET_ACCESS_KEY='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'
ENV AWS_REGION='ap-southeast-1'
ENV AWS_S3_BUCKET_NAME='torii-nihongo-storage'
ENV REDIS_URL='redis://default:password@localhost:6379'

ENV JANUS_HTTP_URL='https://janus.torii-nihongo-gakuin.io.vn/janus'
ENV JANUS_SERVER_URL='wss://janus.torii-nihongo-gakuin.io.vn/ws'
ENV JANUS_WS_URL='wss://janus.torii-nihongo-gakuin.io.vn/ws'

ENV JANUS_ADMIN_SECRET='janusoverlord'
ENV JANUS_API_SECRET='secret123'

# ICE Servers
ENV JANUS_STUN_URL='stun:janus.torii-nihongo-gakuin.io.vn:3478'
ENV JANUS_TURN_URL='turn:janus.torii-nihongo-gakuin.io.vn:3478'
ENV JANUS_TURN_USERNAME='turnuser'
ENV JANUS_TURN_PASSWORD='turnpassword'

ENV REDIS_URL='redis://default:Lk1gyFJXcgIHBBCjb6e38WQFozS2fbqs@redis-18098.c252.ap-southeast-1-1.ec2.redns.redis-cloud.com:18098'

ENV SEPAY_ACCOUNT_NUMBER=00001053256
ENV SEPAY_BANK_CODE=TPBank
ENV SEPAY_ACCESS_KEY=YAG3ASSBDOVUDKRQ9RQC7KLZOBJ2LOIQCWU3AO87VXMU0QHNJ4T1GN65ZK0SRBPF
ENV SEPAY_API_URL=https://my.sepay.vn/userapi/transactions/create
ENV SEPAY_WEBHOOK_URL=https://develop.torii-nihongo-gakuin.io.vn/payments/sepay/webhook

ENV OPENAI_API_KEY=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
ENV OPENAI_MODEL=gpt-5-nano-2025-08-07
ENV OPENAI_TEMPERATURE=0.3
ENV OPENAI_MAX_TOKENS=0

ENV MCP_ENABLED=true
ENV MCP_TOOL_APPROVAL_REQUIRED=false
ENV MCP_MAX_TOOL_EXECUTIONS=10

ENV MCP_COURSE_SERVER_URL=https://agent.torii-nihongo-gakuin.io.vn/course/mcp
ENV MCP_COURSE_ENABLED=true

ENV MCP_ENROLLMENT_SERVER_URL=https://agent.torii-nihongo-gakuin.io.vn/enrollment/mcp
ENV MCP_ENROLLMENT_ENABLED=true

ENV MCP_FLASHCARD_SERVER_URL=https://agent.torii-nihongo-gakuin.io.vn/flashcard/mcp
ENV MCP_FLASHCARD_ENABLED=true

ENV MCP_BLOG_SERVER_URL=https://agent.torii-nihongo-gakuin.io.vn/blog/mcp
ENV MCP_BLOG_ENABLED=true
# Frontend URL for redirects
ENV FRONTEND_URL=http://localhost:3000

CMD ["node", "dist/src/main.js"]
