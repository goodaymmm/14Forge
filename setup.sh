#!/bin/bash

# LoL Performance Analytics Platform - Setup Script

echo "==============================================="
echo "  LoL Performance Analytics Platform Setup"
echo "  14Forge - 14-Minute Analysis™"
echo "==============================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
else
    echo "✅ Node.js $(node --version)"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
else
    echo "✅ npm $(npm --version)"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed (optional for local development)"
else
    echo "✅ Docker $(docker --version)"
fi

echo ""
echo "Setting up environment..."

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your:"
    echo "   - RIOT_API_KEY from https://developer.riotgames.com/"
    echo "   - Database credentials"
    echo "   - (Optional) BrightData API key"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd backend/api
npm install
echo "✅ Backend dependencies installed"

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd ../../frontend
npm install
echo "✅ Frontend dependencies installed"

cd ..

echo ""
echo "==============================================="
echo "  Setup Complete!"
echo "==============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env file with your API keys"
echo ""
echo "2. Start PostgreSQL:"
echo "   With Docker:  docker-compose up postgres"
echo "   Or install locally"
echo ""
echo "3. Run database migrations:"
echo "   psql -U postgres -d lol_stats < database/init.sql"
echo ""
echo "4. Start the services:"
echo ""
echo "   Option A - Docker (recommended):"
echo "     cd backend && docker-compose up"
echo ""
echo "   Option B - Local development:"
echo "     Terminal 1: cd backend/api && npm run dev"
echo "     Terminal 2: cd frontend && npm run dev"
echo ""
echo "5. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   API: http://localhost:3000"
echo ""
echo "Happy coding! 🚀"