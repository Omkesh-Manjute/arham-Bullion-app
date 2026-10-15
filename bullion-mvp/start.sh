#!/bin/bash

echo "🚀 Starting Bullion Live MVP..."

# Start Backend
echo "Starting Backend (port 5000)..."
cd backend
npm run dev &
BACKEND_PID=$!

sleep 3

# Start Admin
echo "Starting Admin Panel (port 5173)..."
cd ../admin
npm run dev &
ADMIN_PID=$!

sleep 3

# Start Mobile (Expo)
echo "Starting Mobile App..."
cd ../mobile
npx expo start --web &

echo ""
echo "✅ All services started!"
echo "🔗 Backend: http://localhost:5000"
echo "🔗 Admin:   http://localhost:5173"
echo "🔗 Mobile:  http://localhost:8081 (or Expo app)"
echo ""
echo "Press Ctrl+C to stop all services"

wait $BACKEND_PID $ADMIN_PID