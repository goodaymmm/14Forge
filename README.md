# 14Forge - LoL Performance Analytics Platform

*This is a submission for the [AI Agents Challenge powered by n8n and Bright Data](https://dev.to/challenges/brightdata-n8n-2025-08-13)*

## 🏆 Contest Entry - BrightData + n8n Contest 2025

A revolutionary League of Legends analytics platform featuring unique **14-Minute Analysis™** technology, powered by n8n AI Agents and BrightData web scraping.

![14Forge Banner](https://img.shields.io/badge/14Forge-Analytics_Platform-purple?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![n8n](https://img.shields.io/badge/n8n-AI_Agent-orange?style=flat-square)
![BrightData](https://img.shields.io/badge/BrightData-Verified_Node-blue?style=flat-square)

## 🎯 What Makes 14Forge Unique?

### 14-Minute Analysis™
Based on statistical analysis of thousands of games, the 14-minute mark is identified as a critical inflection point in League of Legends matches. Our platform provides:
- **Win probability prediction** based on 14-minute game state
- **Performance benchmarking** against high-rank players
- **AI-powered coaching** with personalized recommendations
- **Heatmap visualization** of player movements and ward placements

### Key Features
- 🤖 **AI Coaching (14 Coacher™)**: GPT-4/Gemini-powered analysis with multi-language support (EN/JP/KR)
- 📊 **Multi-Source Meta Analysis**: Aggregates data from Blitz.gg, OP.GG, and Mobalytics
- 🗺️ **Interactive Heatmaps**: Visualize positioning, combat, and vision control
- 🌍 **Global Meta Comparison**: Compare strategies across KR/NA/EU/JP regions
- ⚡ **Real-time Data**: 5-minute cache for Riot API, 6-hour cache for AI analysis

## 📸 Screenshots

### Main Dashboard
![Dashboard](./docs/images/dashboard.png)

### 14-Minute Analysis
![14-Minute Analysis](./docs/images/14min-analysis.png)

### AI Coaching Interface
![AI Coaching](./docs/images/ai-coaching.png)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15
- n8n (self-hosted or cloud)
- API Keys:
  - Riot Games API Key
  - BrightData Account
  - OpenAI/Gemini API Key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/goodaymmm/14Forge.git
cd 14Forge
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start PostgreSQL with Docker**
```bash
cd backend
docker-compose up -d postgres
```

4. **Run database migrations**
```bash
cd backend/api
npm install
npm run db:migrate
```

5. **Start the backend server**
```bash
cd backend/api
npm run dev
# Server runs on http://localhost:3000
```

6. **Start the frontend**
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

7. **Set up n8n workflows**
```bash
# Start n8n
docker-compose up -d n8n
# Access n8n at http://localhost:5678
# Import workflows from n8n_workflows/ directory
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Riot API (Get from https://developer.riotgames.com)
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lol_stats
DB_USER=postgres
DB_PASSWORD=postgres

# BrightData
BRIGHTDATA_USERNAME=brd-customer-xxxxxxxx
BRIGHTDATA_PASSWORD=xxxxxxxx
BRIGHTDATA_ZONE=lol_stats_unlocker

# AI Services
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx

# n8n
N8N_WEBHOOK_URL=http://localhost:5678
```

### n8n Workflow Setup

1. Access n8n UI at `http://localhost:5678`
2. Import the following workflows from `n8n_workflows/`:
   - `14coacher.json` - Main AI coaching workflow
   - `Build-Blitz-Collector.json` - Meta data collection (⚠️ Takes ~2 hours per run)
   - `Match-Statistics-Collector.json` - Match statistics aggregation (⚠️ Takes ~2 hours per run)

**⚠️ Important Note**: The knowledge base workflows (`Build-Blitz-Collector` and `Match-Statistics-Collector`) process massive amounts of dynamic content and can take up to 2 hours to complete. These should be run periodically (e.g., daily) to keep meta data current.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Tailwind CSS
- **Backend**: Express.js, TypeScript, PostgreSQL 15, Winston
- **Integration**: n8n (workflow automation), BrightData (web scraping)
- **AI**: OpenAI GPT-4, Google Gemini 2.0 Flash
- **Infrastructure**: Docker, Docker Compose

### Data Flow
```
User Request → Frontend → Backend API → Cache Check
                                           ↓
                                    [Cache Miss]
                                           ↓
                              Riot API / n8n Webhook
                                           ↓
                               BrightData Scraping
                                           ↓
                                  AI Analysis
                                           ↓
                                 PostgreSQL Storage
                                           ↓
                                  Response to User
```

## 📊 n8n Workflows

### 14 Coacher™ Workflow
The main AI coaching workflow that:
1. Receives match data via webhook
2. Fetches high-rank benchmarks using BrightData
3. Analyzes performance with GPT-4/Gemini
4. Returns personalized coaching recommendations

### Meta Collection Workflows
- **Build-Blitz-Collector**: Scrapes champion builds from Blitz.gg
- **Match-Statistics-Collector**: Aggregates match statistics across regions

## 🌟 Key Achievements

### Performance Optimizations
- 75% reduction in processing time through parallel scraping
- Promise.all implementation for concurrent operations
- Resource blocking (images/CSS/fonts) for faster page loads
- Optimized from 855 to 280 champion-role combinations

### Data Quality
- 100% success rate for champion data collection
- Dual win-rate tracking (Build WR / Rune WR)
- Confidence scoring system (0-100 based on sample size)
- NO HARDCODING policy - all values dynamically fetched

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend/api
npm test

# Frontend tests
cd frontend
npm test
```

### Test n8n Webhook
```bash
# Windows
test-webhook.cmd

# Linux/Mac
./test-webhook.sh
```

## 📝 Documentation

- [Frontend Design Document](./docs/frontend-detailed-design-v2.md)
- [BrightData Strategy](./docs/brightdata-strategy.md)
- [Implementation Guide](./docs/implementation-guide-v2.md)
- [Japanese README](./README_jp.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Riot Games** for providing the comprehensive API
- **BrightData** for powerful web scraping capabilities
- **n8n** for the amazing workflow automation platform
- **Contest Organizers** for this opportunity

## 📞 Contact

- GitHub: [@goodaymmm](https://github.com/goodaymmm)
- Project Link: [https://github.com/goodaymmm/14Forge](https://github.com/goodaymmm/14Forge)

---

**Built with ❤️ for the BrightData + n8n Contest 2025**