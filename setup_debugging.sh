#!/bin/bash
# Setup script for high score debugging

echo "======================================"
echo "High Score Debugging Setup"
echo "======================================"
echo ""

# Get database credentials
read -p "Enter MySQL username [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Enter MySQL password: " DB_PASSWORD
echo ""

read -p "Enter database name [getfrisch]: " DB_NAME
DB_NAME=${DB_NAME:-getfrisch}

echo ""
echo "Running database migration..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < server/migrations/add_client_logs.sql

if [ $? -eq 0 ]; then
    echo "✓ Database migration completed successfully"
else
    echo "✗ Database migration failed"
    exit 1
fi

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Restart your Flask server"
echo "2. Test the remote logger in browser console:"
echo "   remoteLogger.info('Test', {foo: 'bar'})"
echo ""
echo "3. View logs in real-time:"
echo "   python server/view_client_logs.py --follow"
echo ""
echo "4. View recent errors:"
echo "   python server/view_client_logs.py --level error"
echo ""
echo "See HIGH_SCORE_DEBUGGING_GUIDE.md for full documentation"
