# Build stage for dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Builder stage for the Next.js application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy the .env.local file and rename it to .env for the build process
COPY .env.local ./.env

RUN npm install -g pnpm
RUN pnpm run build

# --- FINAL PRODUCTION STAGE ---
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Install Python and create user/group (as root)
RUN apk add --no-cache python3 py3-pip
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create and set up Python virtual environment (as root)
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
COPY ./backend/requirements.txt /app/backend/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /app/backend/requirements.txt
COPY ./backend /app/backend

# Copy Next.js assets (as root)
COPY --from=builder /app/public ./public
RUN mkdir .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 1. Copy the entrypoint script (as root)
COPY ./backend/entrypoint.sh .

# 2. Make it executable (as root)
RUN chmod +x entrypoint.sh

# 3. NOW, change ownership of ALL application files to the non-root user
RUN chown -R nextjs:nodejs /app

# 4. Switch to the non-root user for the final running process
USER nextjs

# Expose ports
EXPOSE 3000
EXPOSE 8000

# Set the entrypoint for the container
ENTRYPOINT ["./entrypoint.sh"]