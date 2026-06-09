# Use Node 22 Bullseye as base image
FROM node:22-bullseye

# Install Python 3, pip, and git
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

# Set up work directory and sandbox
WORKDIR /sandbox

# Change ownership of /sandbox to the unprivileged node user
RUN mkdir -p /sandbox && chown -R node:node /sandbox || true
RUN mkdir -p /workspace-src && chown -R node:node /workspace-src || true

# Run as unprivileged node user
USER node

# Default command to keep container alive
CMD ["tail", "-f", "/dev/null"]
