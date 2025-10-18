# AI Voice Receptionist

A locally runnable system that receives phone calls via LiveKit, escalates unknown queries to human supervisors through a Next.js dashboard, updates a persisted knowledge base, and provides follow-up responses to callers.

> **🎉 Current Status**: Fully functional with Python voice agent using Gemini 2.0 Flash (free tier), LiveKit for voice infrastructure, and Next.js dashboard for supervision.

## 🏗️ Architecture

The system consists of two main components:

- **Python Voice Agent**: LiveKit-based agent using Gemini 2.0 Flash that handles phone calls with STT/LLM/TTS pipeline
- **Supervisor Dashboard**: Next.js web application for human oversight and knowledge management

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for Next.js dashboard)
- Python 3.11+ (for voice agent)
- API keys for:
  - LiveKit
  - OpenAI/Anthropic/Google (for LLM)
  - ElevenLabs (for TTS)
  - Deepgram (for STT)

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd ai-voice-receptionist
   ```

2. **Setup environment files:**

   ```bash
   # Copy environment files
   cp .env.example .env
   cp python-agent/.env.example python-agent/.env

   # Edit both .env files with your actual API keys
   ```

3. **Start the database:**

   ```bash
   # Start PostgreSQL database
   docker-compose up -d postgres

   # Wait for database to be ready
   docker-compose exec postgres pg_isready -U postgres
   ```

4. **Install dependencies and setup database:**

   ```bash
   # Install web dependencies
   npm install

   # Install Python agent dependencies
   cd python-agent && pip install -r requirements.txt && cd ..

   # Generate Prisma client and setup database
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

### Production Deployment

For production, use the optimized production configuration:

```bash
# Build production images with multi-stage builds
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Docker Optimizations

The system includes several Docker optimizations:

- **Multi-stage builds**: Separate development and production stages for smaller images
- **Layer caching**: Dependencies cached separately from application code for faster rebuilds
- **Security**: Non-root users in containers
- **Build efficiency**: .dockerignore files exclude unnecessary files from build context
- **Production-ready**: Minimal production images with only required dependencies

2. **Configure environment variables:**
   - Update `.env` with your API keys
   - Update `python-agent/.env` with your API keys

3. **Start the services:**

   ```bash
   # Start database and web application
   docker-compose up -d
   npm run dev

   # In another terminal, start the voice agent
   cd python-agent
   python voice_agent.py console
   ```

4. **Access the applications:**
   - Supervisor Dashboard: http://localhost:3000
   - Database Admin (Adminer): http://localhost:8081
   - Prisma Studio: `npm run db:studio`
   - API Health Check: http://localhost:3000/api/health

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages and API routes
├── components/             # React UI components
├── lib/                    # Utility functions and configurations
├── prisma/                 # Database schema and migrations
├── python-agent/           # Python LiveKit voice agent with Gemini 2.0 Flash

├── types/                  # TypeScript type definitions
├── docs/                   # Documentation files
├── tests/                  # Test files and test runners
├── public/                 # Static assets
└── docker-compose.yml      # Docker services configuration
```

## 🛠️ Development

### Available Scripts

**Web Application:**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

**Python Voice Agent:**

- `cd python-agent && python voice_agent.py console` - Start agent in console mode
- `cd python-agent && python voice_agent.py dev` - Start agent in development mode
- `cd python-agent && pip install -r requirements.txt` - Install agent dependencies
- `cd python-agent && python test_agent.py` - Test agent configuration
- `cd python-agent && python setup.py` - Setup agent environment

**Docker:**

- `docker-compose up -d` - Start all services in background
- `docker-compose down` - Stop all services
- `docker-compose logs -f [service]` - View service logs

**Available Services:**

- `postgres` - PostgreSQL database
- `web` - Next.js web application
- `python-agent` - Python voice agent
- `adminer` - Database admin interface

### Database Management

The system uses PostgreSQL with Prisma ORM. The database schema includes:

- `HelpRequest` - Escalated queries from voice agent
- `KnowledgeBase` - Question-answer pairs for the AI
- `SystemLog` - Audit trail and debugging logs

### Key Directories

- **`app/`** - Next.js 14 App Router with API routes and pages
- **`components/`** - Reusable React components with shadcn/ui
- **`python-agent/`** - Standalone Python voice agent with Gemini 2.0 Flash
- **`lib/`** - Shared utilities, database client, and webhook handlers
- **`prisma/`** - Database schema, migrations, and seed data
- **`docs/`** - Comprehensive documentation and guides
- **`tests/`** - System, performance, and validation tests

## 🔧 Configuration

### Environment Variables

See `.env.example` and `python-agent/.env` for all available configuration options.

Key configurations:

- `CONFIDENCE_THRESHOLD` - Threshold for escalating to supervisor (0.0-1.0)
- `GOOGLE_API_KEY` - Google Gemini API key for LLM
- `DEEPGRAM_API_KEY` - Deepgram API key for speech-to-text
- `ELEVENLABS_API_KEY` - ElevenLabs API key for text-to-speech

### Feature Flags

The system supports runtime feature flags for:

- Real-time updates
- Knowledge base learning
- Advanced logging
- Metrics collection

## 📊 Monitoring

- System health: `GET /api/health`
- Structured logging with Winston
- Request/response tracking
- Performance metrics collection

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Build

```bash
# Build web application
npm run build

# Voice agent is ready to run (no build step needed for Python)
cd python-agent && python voice_agent.py dev
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 📝 API Documentation

### Help Requests

- `POST /api/help-requests` - Create new help request
- `GET /api/help-requests` - List help requests with filtering
- `POST /api/help-requests/[id]/resolve` - Resolve a request
- `POST /api/help-requests/[id]/mark-unresolved` - Mark as unresolved

### Knowledge Base

- `GET /api/knowledge` - List knowledge entries
- `POST /api/knowledge` - Create knowledge entry
- `PUT /api/knowledge/[id]` - Update knowledge entry
- `DELETE /api/knowledge/[id]` - Delete knowledge entry

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Issues:**

```bash
# Stop all services
docker-compose down

# Remove database volume (WARNING: This deletes all data)
docker volume rm ai-voice-receptionist_postgres_data

# Restart services and reinitialize database
docker-compose up -d postgres
npm run db:push
npm run db:seed
```

**Port Conflicts:**

- Web app: Change port in `docker-compose.yml` (default: 3000)
- Database: Change PostgreSQL port in `docker-compose.yml` (default: 5432)

**LiveKit Connection Issues:**

- Verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`
- Check network connectivity to LiveKit server
- Review agent logs: `docker-compose logs -f python-agent`

**Python Agent Issues:**

- Ensure Python 3.11+ is installed
- Install dependencies: `cd python-agent && pip install -r requirements.txt`
- Check API keys in `python-agent/.env`
- Python agent connects directly to LiveKit
- Test the agent: `cd python-agent && python test_agent.py`

For more help, check the logs:

```bash
# Web application logs
docker-compose logs -f web

# Python voice agent logs
docker-compose logs -f python-agent

# Database logs
docker-compose logs -f postgres
```

## 📚 Additional Documentation

- `docs/DOCKER_OPTIMIZATION.md` - Docker build optimizations and best practices
- `docs/DEMO_SCRIPT.md` - Comprehensive demo script for showcasing the system
- `docs/TROUBLESHOOTING.md` - Detailed troubleshooting guide
