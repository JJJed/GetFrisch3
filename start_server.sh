#!/bin/bash

# GetFrisch3 Server Startup Script

echo "Starting GetFrisch3 Server..."

# Check if virtual environment exists
if [ ! -d "server/venv" ]; then
    echo "Virtual environment not found. Creating one..."
    cd server
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
    cd ..
else
    cd server
    source venv/bin/activate
    cd ..
fi

# Check if .env exists
if [ ! -f "config/.env" ]; then
    echo "ERROR: config/.env not found!"
    echo "Please copy config/.env.example to config/.env and configure it."
    exit 1
fi

# Check if database is initialized
echo "Checking database..."
cd server
python -c "
from app import app, db
from models.user import User

with app.app_context():
    try:
        # Try to query users table
        User.query.first()
        print('Database is initialized.')
    except:
        print('Database not initialized. Initializing now...')
        db.create_all()
        print('Database initialized successfully!')
" || exit 1

# Start the server
echo "Starting Flask server..."
echo "Server will be available at http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo ""

python app.py
