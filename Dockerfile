# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS build-client

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine AS server

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built frontend from stage 1
COPY --from=build-client /app/client/dist ./client/dist

# Create a directory for the SQLite database with correct permissions
RUN mkdir -p /data && chown node:node /data

# Run as non-root user
USER node

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production
# Override DB path to writable /data volume
ENV DB_PATH=/data/data.db

CMD ["node", "server/index.js"]
