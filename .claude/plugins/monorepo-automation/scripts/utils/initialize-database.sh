#!/bin/bash
# Initialize build history database
# Usage: ./initialize-database.sh

DB_PATH="D:/databases/monorepo-automation.db"
SCHEMA_FILE="$CLAUDE_PLUGIN_ROOT/scripts/utils/initialize-database.sql"

echo "Initializing build history database..."
echo "Database: $DB_PATH"

# Create database directory if it doesn't exist
mkdir -p "$(dirname "$DB_PATH")"

# Initialize database with schema
sqlite3 "$DB_PATH" < "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Database initialized successfully"
  echo "Tables created: builds, test_results, deployments, dependency_updates"
else
  echo "❌ Database initialization failed"
  exit 1
fi
