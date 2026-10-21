# Production Dockerfile for Quiz Competition Platform (Oracle Cloud Infrastructure / OCI)
FROM node:22-bookworm-slim

# Install Python 3 (required for the deterministic scoring & ranking engine) and curl (for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build Vite client production assets into dist/
RUN npm run build

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON_PORT=5001
ENV PYTHON_CMD=python3

# Expose gateway port
EXPOSE 3000

# Gateway healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Launch the gateway server (starts Python backend on 5001 and Express gateway on 3000)
CMD ["npm", "run", "start"]
