# Production Dockerfile for Quiz Competition Platform
# Compatible with Hugging Face Spaces (Docker), Oracle Cloud, and Docker Compose
FROM node:22-bookworm-slim

# Install Python 3 (required for the deterministic scoring & ranking engine) and curl (for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 curl && \
    rm -rf /var/lib/apt/lists/*

# Set up user with UID 1000 (Required for Hugging Face Spaces security sandbox)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy package manifests first for optimal caching
COPY --chown=user package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY --chown=user . .

# Build Vite client production assets into dist/
RUN npm run build

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV PYTHON_PORT=5001
ENV PYTHON_CMD=python3

# Expose ports (7860 for Hugging Face Spaces default, 3000 for standard Docker)
EXPOSE 7860 3000

# Gateway healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-7860}/health || exit 1

# Launch the gateway server (starts Python backend on 5001 and Express gateway on PORT)
CMD ["npm", "run", "start"]
