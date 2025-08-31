# n8n Dockerfile for LoL Analytics Platform
FROM n8nio/n8n:latest

USER root

# Install additional dependencies if needed
RUN apk add --no-cache \
    curl \
    jq \
    postgresql-client

# Create custom nodes directory
RUN mkdir -p /home/node/.n8n/custom && \
    chown -R node:node /home/node/.n8n

USER node

# Set environment variables for Cloud Run compatibility
ENV PORT=5678
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=https
ENV N8N_HOST=0.0.0.0
ENV N8N_DIAGNOSTICS_ENABLED=false
ENV N8N_PERSONALIZATION_ENABLED=false
ENV EXECUTIONS_PROCESS=main
ENV N8N_USER_FOLDER=/home/node/.n8n

# Create directories for workflows and data
RUN mkdir -p /home/node/.n8n/workflows

# Expose port
EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5678/healthz || exit 1

# Start n8n
CMD ["n8n", "start"]