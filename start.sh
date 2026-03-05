#!/bin/sh

echo "Starting Personal News..."

cd /app/backend
python main.py &
BACKEND_PID=$!

cd /app/frontend
PORT=3000 node server.js &
FRONTEND_PID=$!

echo "Backend  → http://localhost:8000  (PID $BACKEND_PID)"
echo "Frontend → http://localhost:3000  (PID $FRONTEND_PID)"

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

# Poll until either process exits
while kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; do
  sleep 2
done

echo "A process exited — shutting down"
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
wait
exit 1
