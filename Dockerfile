# =============================================================================
# Joineazy - Unified Multi-Stage Production Dockerfile (Single-Origin Deployment)
# Suitable for Render Web Services, Railway, or standalone production containers
# =============================================================================

# Stage 1: Build the React + Vite Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Install Backend Production Dependencies
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Stage 3: Unified Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy compiled frontend assets into /app/client/dist
COPY --from=client-builder /app/client/dist /app/client/dist

# Copy backend dependencies and source files
COPY --from=server-deps /app/server/node_modules /app/server/node_modules
COPY server /app/server

WORKDIR /app/server

# Security: Run as non-root node user
USER node

EXPOSE 5000

CMD ["node", "src/index.js"]
