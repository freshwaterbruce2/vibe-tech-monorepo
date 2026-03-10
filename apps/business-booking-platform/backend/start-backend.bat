@echo off
echo Starting backend server...
set PORT=3001
set NODE_ENV=development
set LOCAL_SQLITE=true
set DATABASE_PATH=./data/vibe-booking.db
set JWT_SECRET=dev_jwt_secret_change_this_in_production_minimum_32_chars
set JWT_REFRESH_SECRET=dev_refresh_secret_change_this_in_production_32_chars
npx tsx src/server.ts