# Simple Dockerfile for the SESAR task manager (Flask backend + static frontend)

FROM python:3.12-slim

# Set a directory for the app
WORKDIR /app

# Install system dependencies (if any)
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage docker cache
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full app (backend + frontend)
COPY backend/ ./backend
COPY frontend/ ./frontend

# Ensure tasks.json exists and is writable
RUN mkdir -p /app/backend && \
    touch /app/backend/tasks.json && \
    chmod 666 /app/backend/tasks.json

WORKDIR /app/backend

# Expose port used by Flask
EXPOSE 5000

# Run the Flask server
CMD ["python", "app.py"]