#!/bin/sh
set -e

echo "Starting Personal News..."

# Start the FastAPI backend
cd /app/backend
python main.py &
BACKEND_PID=$!

# Start the Next.js frontend (standalone server)
cd /app/frontend
node server.js &
FRONTEND_PID=$!

echo "Backend  → http://localhost:8000  (PID $BACKEND_PID)"
echo "Frontend → http://localhost:3000  (PID $FRONTEND_PID)"

# Wait for either process to exit, then shut down both
wait -n $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
wait
