# Use python 3.11 slim image
FROM python:3.11-slim

# Install uv from official build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory inside container
WORKDIR /app

# Copy dependency definition files
COPY pyproject.toml uv.lock ./

# Sync dependencies without installing the project code first to leverage Docker caching
RUN uv sync --frozen --no-install-project --no-dev

# Download SpaCy model inside the virtual environment
RUN uv run python -m spacy download en_core_web_sm

# Copy configuration and code
COPY config.yaml ./
COPY app ./app

# Add app path to PYTHONPATH
ENV PYTHONPATH=/app

# Expose the default port for Hugging Face Spaces
EXPOSE 7860

# Run FastAPI app via uvicorn on port 7860
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
