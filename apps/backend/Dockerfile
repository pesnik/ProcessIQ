# Use Python 3.11 as base image
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    # Playwright browser dependencies
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgtk-3-0 \
    libatspi2.0-0 \
    libxss1 \
    libasound2 \
    # OCR dependencies
    tesseract-ocr \
    tesseract-ocr-eng \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY pyproject.toml ./
RUN pip install --upgrade pip setuptools wheel && \
    pip install -e .[all]

# Install Playwright browsers
RUN playwright install chromium firefox webkit

# Copy application code
COPY src/ ./src/
COPY examples/ ./examples/
COPY config/ ./config/
COPY scripts/ ./scripts/

# Create necessary directories
RUN mkdir -p /app/{plugins,data,output,logs}

# Set Python path
ENV PYTHONPATH=/app/src:$PYTHONPATH

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash processiq && \
    chown -R processiq:processiq /app
USER processiq

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Default command
CMD ["python", "-m", "uvicorn", "processiq.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Development stage
FROM base as development

# Install development dependencies
RUN pip install -e .[dev]

# Enable hot reload
CMD ["python", "-m", "uvicorn", "processiq.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base as production

# Use gunicorn for production
RUN pip install gunicorn

# Production optimizations
ENV ENVIRONMENT=production \
    DEBUG=false

CMD ["gunicorn", "processiq.api.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]