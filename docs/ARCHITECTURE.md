# AI Voice Receptionist - System Architecture

## 🏗️ Overview

The AI Voice Receptionist is a full-stack system that handles phone calls through LiveKit, processes queries using AI, escalates unknown questions to human supervisors, and maintains a persistent knowledge base. The system consists of two main components working together to provide intelligent voice reception services.

## 🎯 System Components

### 1. **Next.js Web Application** (`/`)
- **Framework**: Next.js 15 with App Router
- **Purpose**: Supervisor dashboard and API backend
- **Port**: 3000 (development), configurable in production

### 2. **Python Voice Agent** (`/python-agent/`)
- **Framework**: LiveKit Agents SDK with Gemini 2.0 Flash
- **Purpose**: Real-time voice processing and AI conversation
- **Port**: 8080 (webhook server)

## 📊 Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Phone Call    │───▶│   LiveKit Cloud  │───▶│  Python Agent   │
│   (Caller)      │    │   (Voice Infra)  │    │  (Voice AI)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Supervisor    │◀───│   Next.js Web    │◀───│   PostgreSQL    │
│   Dashboard     │    │   Application    │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🗂️ Directory Structure

```
ai-voice-receptionist/
├── 📁 app/                     # Next.js App Router
│   ├── 📁 api/                 # API Routes
│   │   ├── 📁 health/          # System health checks
│   │   ├── 📁 help-requests/   # Help request management
│   │   ├── 📁 knowledge/       # Knowledge base CRUD
│   │   └── 📁 voice-agent/     # Voice agent integration
│   ├── 📁 dashboard/           # Supervisor dashboard pages
│   ├── 📁 knowledge/           # Knowledge management pages
│   └── 📄 layout.tsx           # Root layout with providers
│
├── 📁 components/              # React UI Components
│   ├── 📁 help-requests/       # Help request components
│   ├── 📁 knowledge/           # Knowledge base components
│   ├── 📁 layout/              # Layout components (header, sidebar)
│   └── 📁 ui/                  # Reusable UI components (shadcn/ui)
│
├── 📁 lib/                     # Utility Libraries
│   ├── 📁 hooks/               # Custom React hooks
│   ├── 📁 stores/              # State management (Zustand)
│   ├── 📄 prisma.ts            # Database client
│   ├── 📄 voice-agent.ts       # Voice agent logic
│   └── 📄 validations.ts       # Schema validations
│
├── 📁 prisma/                  # Database Schema & Migrations
│   ├── 📄 schema.prisma        # Database schema definition
│   └── 📄 seed.ts              # Database seeding
│
├── 📁 python-agent/            # Python Voice Agent
│   ├── 📄 voice_agent.py       # Main agent implementation
│   ├── 📄 requirements.txt     # Python dependencies
│   └── 📄 test_*.py            # Agent tests
│
├── 📁 types/                   # TypeScript Type Definitions
├── 📁 tests/                   # Test Suites
├── 📁 docs/                    # Documentation
└── 📁 public/                  # Static Assets
```

## 🔄 Data Flow Architecture

### 1. **Voice Call Processing Flow**

```
Phone Call → LiveKit → Python Agent → AI Processing → Response
     ↓                                      ↓
Knowledge Base Query ←→ Next.js API ←→ PostgreSQL
     ↓                                      ↓
Escalation (if needed) → Help Request → Supervisor Dashboard
```

### 2. **Supervisor Resolution Flow**

```
Supervisor Dashboard → Resolve Request → Webhook → Python Agent → Caller Response
```

## 🗄️ Database Schema

### Core Tables

#### **HelpRequest**
```sql
- id: UUID (Primary Key)
- callerId: String (Optional)
- callerPhone: String (Optional)
- question: String (Required)
- status: ENUM (PENDING, RESOLVED, UNRESOLVED)
- answer: String (Optional)
- createdAt: DateTime
- updatedAt: DateTime
- timeoutAt: DateTime (Optional)
- resolvedBy: String (Optional)
- metadata: JSON (Optional)
```

#### **KnowledgeBase**
```sql
- id: UUID (Primary Key)
- question: String (Unique)
- answer: String (Required)
- source: String (supervisor, manual, import)
- createdAt: DateTime
- updatedAt: DateTime
```

#### **SystemLog**
```sql
- id: UUID (Primary Key)
- level: String (info, warn, error)
- event: String (CALL_RECEIVED, HELP_REQUEST_CREATED, etc.)
- message: String
- metadata: JSON (Optional)
- createdAt: DateTime
```

## 🔧 Technology Stack

### **Frontend & Backend**
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation

### **Database & ORM**
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Migrations**: Prisma Migrate
- **Connection Pooling**: Built-in Prisma connection pooling

### **Voice Agent**
- **Language**: Python 3.11+
- **Framework**: LiveKit Agents SDK
- **AI Model**: Google Gemini 2.0 Flash Lite
- **STT**: Deepgram Nova-2
- **TTS**: ElevenLabs Turbo v2
- **VAD**: Silero Voice Activity Detection

### **Infrastructure**
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (production)
- **Process Management**: PM2 (optional)
- **Monitoring**: Built-in health checks

## 🔌 API Architecture

### **REST API Endpoints**

#### Help Requests
```
GET    /api/help-requests          # List help requests
POST   /api/help-requests          # Create help request
POST   /api/help-requests/[id]/resolve  # Resolve request
```

#### Knowledge Base
```
GET    /api/knowledge              # List knowledge entries
POST   /api/knowledge              # Create knowledge entry
PUT    /api/knowledge/[id]         # Update knowledge entry
DELETE /api/knowledge/[id]         # Delete knowledge entry
GET    /api/knowledge/search       # Search knowledge base
```

#### Voice Agent Integration
```
POST   /api/voice-agent/process    # Process voice messages
POST   /api/voice-agent/tts        # Text-to-speech generation
POST   /api/voice-agent/check-updates  # Check for resolved requests
```

#### System Health
```
GET    /api/health                 # System health check
```

### **Webhook Integration**
```
POST   /webhook                    # Receive supervisor resolutions
GET    /health                     # Agent health check
```

## 🧠 AI Processing Pipeline

### **Voice Agent Intelligence Flow**

1. **Voice Input Processing**
   - LiveKit receives phone call
   - Deepgram STT converts speech to text
   - Silero VAD detects speech activity

2. **Knowledge Matching**
   - Fuzzy matching for common patterns
   - Semantic search in knowledge base
   - Confidence scoring (0.0 - 1.0)

3. **AI Decision Making**
   - **High Confidence (0.8-0.9)**: Direct answer from knowledge base
   - **Medium Confidence (0.4-0.7)**: Ask for clarification
   - **Low Confidence (0.1-0.3)**: Escalate to supervisor

4. **Response Generation**
   - Gemini 2.0 Flash generates contextual response
   - ElevenLabs TTS converts to speech
   - LiveKit delivers audio to caller

### **Escalation Logic**

```python
if confidence < threshold:
    # Check for duplicate requests
    if is_duplicate_request():
        return "Similar question already escalated"
    
    # Create help request
    request_id = create_help_request()
    
    # Notify supervisor via dashboard
    # Wait for webhook resolution
```

## 🔄 Real-time Communication

### **WebSocket Connections**
- LiveKit handles real-time voice streaming
- Dashboard uses polling for updates (10-second intervals)
- Webhook notifications for instant supervisor responses

### **Caching Strategy**
- Knowledge base cached in memory (1-minute refresh)
- Pending requests cached (45-second refresh)
- Database connection pooling for performance

## 🛡️ Security Architecture

### **Authentication & Authorization**
- JWT tokens for API authentication
- Webhook signature verification (HMAC-SHA256)
- Environment-based configuration

### **Data Protection**
- PII substitution in logs and examples
- Secure credential management
- Rate limiting on API endpoints

### **Network Security**
- HTTPS/WSS encryption
- Nginx reverse proxy with security headers
- Docker container isolation

## 📈 Scalability Considerations

### **Horizontal Scaling**
- Stateless Next.js application (multiple instances)
- Database connection pooling
- Load balancer support (Nginx/HAProxy)

### **Performance Optimizations**
- Multi-stage Docker builds
- Layer caching for faster deployments
- Optimized database queries with indexes
- Background job processing

### **Monitoring & Observability**
- Structured logging with Winston
- Health check endpoints
- Performance metrics collection
- Error tracking and alerting

## 🔧 Configuration Management

### **Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://...

# LiveKit
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# AI Services
GOOGLE_API_KEY=...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...

# System Configuration
CONFIDENCE_THRESHOLD=0.7
WEBHOOK_SECRET=...
```

### **Feature Flags**
- Real-time updates toggle
- AI knowledge learning toggle
- Advanced logging toggle
- Metrics collection toggle

## 🚀 Deployment Architecture

### **Development Environment**
```
Docker Compose → PostgreSQL + Next.js Dev Server + Python Agent
```

### **Production Environment**
```
Docker Compose → Nginx → Next.js (Production) + PostgreSQL + Python Agent
```

### **Cloud Deployment Options**
- **AWS**: ECS/Fargate + RDS + ALB
- **GCP**: Cloud Run + Cloud SQL + Load Balancer
- **Azure**: Container Instances + Azure Database + Application Gateway
- **Vercel**: Serverless functions + Supabase + Railway

## 🔍 Testing Strategy

### **Test Types**
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **System Tests**: End-to-end workflow testing
- **Performance Tests**: Load testing with realistic scenarios

### **Test Coverage**
- Voice agent conversation flows
- Knowledge base matching accuracy
- Escalation and resolution workflows
- API endpoint functionality
- Database operations

## 📚 Key Design Patterns

### **Repository Pattern**
- Prisma client abstraction
- Centralized database operations
- Type-safe database queries

### **Factory Pattern**
- AI service initialization
- Configuration management
- Environment-specific setups

### **Observer Pattern**
- Webhook notifications
- Real-time updates
- Event-driven architecture

### **Strategy Pattern**
- Multiple AI providers support
- Configurable confidence thresholds
- Flexible escalation strategies

## 🎯 Future Enhancements

### **Planned Features**
- Multi-language support
- Advanced analytics dashboard
- Integration with CRM systems
- Voice biometrics for caller identification
- Automated knowledge base learning from conversations

### **Scalability Roadmap**
- Kubernetes deployment
- Microservices architecture
- Event streaming with Kafka
- Advanced caching with Redis
- Machine learning model improvements

---

This architecture provides a robust, scalable foundation for the AI Voice Receptionist system, enabling intelligent voice interactions while maintaining human oversight and continuous learning capabilities.