#!/bin/sh
set -e

# Add the virtual environment's bin directory to the PATH
export PATH="/app/venv/bin:$PATH"

# Start the Next.js server in the background
echo "Starting Next.js server on port 3000..."
node server.js &

# Start the Python backend in the foreground
echo "Starting Python backend on port 8000..."
# The 'exec' command here is important. It replaces the shell process with the uvicorn process,
# which allows Docker to correctly handle signals like stopping the container.
exec uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir /app/backend