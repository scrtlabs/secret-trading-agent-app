#!/bin/sh

# This script starts both the Next.js and Python servers.
# It ensures that commands from our Python venv are used.
set -e

# Add the venv's bin directory to the start of the PATH
# This ensures that 'uvicorn' and 'python' refer to the ones in our venv
export PATH="/app/venv/bin:$PATH"

# Start the Next.js server in the background
echo "Starting Next.js server on port 3000..."
node server.js &

# Start the Python FastAPI server in the foreground
echo "Starting Python backend on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir /app/backend