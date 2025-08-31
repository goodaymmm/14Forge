# Custom n8n Docker image based on Debian for better DNS resolution
# Fixes EAI_AGAIN errors caused by Alpine's musl libc limitations

FROM node:20-bullseye-slim

# Install required dependencies
RUN apt-get update && apt-get install -y \
    dnsutils \
    curl \
    git \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install n8n globally
RUN npm install -g n8n@latest

# Install puppeteer-core globally for BrightData integration
RUN npm install -g puppeteer-core@19.11.1

# Create n8n user and directories
RUN useradd -m -s /bin/bash node || true
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node

# Set work directory
WORKDIR /home/node

# Switch to node user
USER node

# Expose n8n port
EXPOSE 5678

# Start n8n
CMD ["n8n", "start"]