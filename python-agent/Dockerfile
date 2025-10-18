# Multi-stage build for optimized Python agent
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd --gid 1001 agent && \
    useradd --uid 1001 --gid agent --shell /bin/bash --create-home agent

# Development stage
FROM base AS dev
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set correct permissions
RUN chown -R agent:agent /app
USER agent

# Expose port (if needed for health checks)
EXPOSE 8000

# Run the agent in development mode
CMD ["python", "voice_agent.py", "dev"]

# Production stage
FROM base AS production
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge

# Copy only necessary application files
COPY voice_agent.py .
COPY setup.py .

# Set correct permissions
RUN chown -R agent:agent /app
USER agent

# Expose port
EXPOSE 8000

# Set production environment
ENV NODE_ENV=production

# Run the agent in production mode
CMD ["python", "voice_agent.py", "prod"]