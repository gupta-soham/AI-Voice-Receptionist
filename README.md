# AI Voice Receptionist

A locally runnable system that receives phone calls via LiveKit, escalates unknown queries to human supervisors through a Next.js dashboard, updates a persisted knowledge base, and provides follow-up responses to callers.

> **🎉 Current Status**: Fully functional with Python voice agent using Gemini 2.0 Flash (free tier), LiveKit for voice infrastructure, and Next.js dashboard for supervision.

## 🏗️ Architecture

The system consists of two main components with enhanced user experience:

- **Python Voice Agent**: LiveKit-based agent using Gemini 2.0 Flash with intelligent fuzzy matching, automatic knowledge learning, and graceful TTS quota handling
- **Next.js Dashboard**: Modern web application with voice input, toast notifications, real-time conversation interface, and comprehensive supervisor tools

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
   cd python-agent
   python -m venv venv
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate
   pip install -r requirements.txt
   cd ..

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
   # Activate virtual environment first
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate

   # Normal mode (clean output)
   python voice_agent.py console

   # Verbose mode (detailed logging for debugging)
   python voice_agent.py --verbose console
   ```

4. **Access the applications:**
   - Supervisor Dashboard: http://localhost:3000
   - Database Admin (Adminer): http://localhost:8081
   - Voice Agent Webhook: http://localhost:8080/health
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

- `cd python-agent && source venv/bin/activate && python voice_agent.py console` - Start agent in console mode
- `cd python-agent && source venv/bin/activate && python voice_agent.py dev` - Start agent in development mode
- `cd python-agent && python -m venv venv && pip install -r requirements.txt` - Setup agent environment
- `cd python-agent && source venv/bin/activate && python test_agent_comprehensive.py` - Run comprehensive tests

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
- `KnowledgeBase` - Question-answer pairs for the AI's knowledge
- `SystemLog` - Audit trail and debugging logs

### Key Features

- **🎤 Voice Input**: Continuous microphone tracking with real-time audio level visualization
- **🔔 Toast Notifications**: Comprehensive feedback system using Sonner with success, error, warning, and info messages
- **💬 Conversation Interface**: Chat-like interface with timestamps and message history
- **🧠 Intelligent Matching**: Fuzzy matching for business hours, services, pricing with keyword recognition
- **📚 Auto-Learning**: Supervisor responses automatically expand the AI's knowledge base
- **🔊 TTS Resilience**: Graceful degradation when text-to-speech quota is exceeded

### Testing Interface

Navigate to `http://localhost:3000` for the comprehensive test interface featuring:

- Voice input with microphone button and audio level indicators
- Text input with quick test question buttons
- Real-time conversation history with chat bubbles
- API response viewer for debugging
- Toast notifications for all operations

### Key Directories

- **`app/`** - Next.js 15 App Router with voice-enabled test interface and API routes
- **`components/`** - Enhanced React components with voice input, toast notifications, and shadcn/ui
- **`python-agent/`** - Standalone Python voice agent with Gemini 2.0 Flash and webhook receiver
- **`lib/`** - Voice agent logic, fuzzy matching, database client, and webhook handlers
- **`prisma/`** - Database schema, migrations, and comprehensive seed data
- **`docs/`** - Updated documentation reflecting current features
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
- AI knowledge learning
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
cd python-agent
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows
python voice_agent.py dev
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 📝 API Documentation

### Core API Endpoints

#### Help Requests

- `POST /api/help-requests` - Create new help request
- `GET /api/help-requests` - List help requests with filtering
- `POST /api/help-requests/[id]/resolve` - Resolve a request (auto-adds to knowledge base)

#### Knowledge Management

- `GET /api/knowledge` - List knowledge entries with search
- `POST /api/knowledge` - Create knowledge entry
- `PUT /api/knowledge/[id]` - Update knowledge entry
- `DELETE /api/knowledge/[id]` - Delete knowledge entry

#### Voice Agent Processing

- `POST /api/voice-agent/process` - Process messages with fuzzy matching and LLM
- `POST /api/voice-agent/tts` - Generate text-to-speech audio (with quota handling)
- `POST /api/voice-agent/check-updates` - Check for resolved help requests

#### System Health

- `GET /api/health` - System health check with comprehensive metrics

## 🎯 Recent Enhancements

### Voice Input & User Experience

- **Continuous Microphone Tracking**: Real-time voice recognition with visual audio level feedback
- **Toast Notification System**: Comprehensive user feedback using Sonner with custom icons
- **Conversation Interface**: Chat-like UI with message bubbles and timestamps
- **Fuzzy Question Matching**: Intelligent pattern recognition for business hours, services, pricing

### AI Improvements

- **Three-Tier Confidence System**: High (direct answer), Medium (ask clarification), Low (escalate)
- **Auto-Learning Knowledge Base**: Supervisor responses automatically added to knowledge
- **Enhanced Business Hours Matching**: Handles variations like "timings", "when open", "hours"
- **TTS Quota Management**: Graceful degradation when ElevenLabs quota exceeded

### System Reliability

- **Error Handling**: Comprehensive error management with user-friendly messages
- **API Optimization**: Removed unused endpoints for cleaner codebase
- **Performance**: Improved response times with fuzzy matching preprocessing

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
- Voice Agent Webhook: Change port in `docker-compose.yml` (default: 8080)

**LiveKit Connection Issues:**

- Verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`
- Check network connectivity to LiveKit server
- Review agent logs: `docker-compose logs -f python-agent`

**Python Agent Issues:**

- Ensure Python 3.11+ is installed
- Setup virtual environment: `cd python-agent && python -m venv venv`
- Activate environment: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
- Install dependencies: `pip install -r requirements.txt`
- Check API keys in `python-agent/.env`
- Python agent connects directly to LiveKit
- Test the agent: `cd python-agent && source venv/bin/activate && python test_agent_comprehensive.py`

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
