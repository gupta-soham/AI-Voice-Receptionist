# 🎙️ LiveKit Voice Agent for AI Receptionist

This is a Python-based LiveKit agent that provides real-time voice interaction capabilities for the AI Voice Receptionist system. The agent features intelligent fuzzy matching, automatic knowledge base learning, and seamless supervisor escalation with toast notifications.

## 🚀 Quick Start

### 1. Create Virtual Environment

```bash
cd python-agent

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
# Make sure virtual environment is activated
pip install -r requirements.txt
```

### 3. Environment Setup

The `.env` file is already configured with your API keys. Make sure your Node.js backend is running on `http://localhost:3000`.

### 4. Run the Agent

#### Option A: CLI Mode (for testing)

```bash
python voice_agent.py console
```

This starts the agent in console mode where you can type messages and hear responses through your computer's speakers.

#### Option B: LiveKit Room Mode

```bash
python voice_agent.py dev
```

This connects the agent to your LiveKit cloud instance and waits for incoming calls.

#### Option C: Connect to Specific Room

```bash
python voice_agent.py connect --room-name "reception-room"
```

## 🎯 How It Works

### Voice Interaction Pipeline

1. **Voice Activity Detection** (Silero VAD) - Detects when someone is speaking
2. **Speech-to-Text** (Deepgram) - Converts speech to text
3. **Knowledge Base Query** - Checks existing answers in your database
4. **LLM Processing** (Google Gemini) - Generates responses for unknown queries
5. **Text-to-Speech** (ElevenLabs) - Converts responses back to speech
6. **Escalation** - Creates help requests in your dashboard for complex queries
7. **Webhook Receiver** - Receives supervisor responses and delivers them back to callers

### Built-in Functions

- `ask_for_clarification()` - Asks users to clarify unclear questions
- `escalate_to_supervisor()` - Escalates questions not covered in AI's knowledge

### Enhanced Features

- **Fuzzy Matching**: Intelligent pattern matching for business hours, services, pricing, and more
- **Toast Notifications**: Real-time user feedback with success, error, warning, and info messages
- **Voice Input**: Continuous microphone tracking with visual audio level indicators
- **Auto-Learning**: Supervisor responses automatically expand the knowledge base
- **TTS Quota Handling**: Graceful degradation when text-to-speech quota is exceeded
- **Confidence Tiers**: Three-level confidence system (High/Medium/Low) for better response handling

### AI Integration

- **Knowledge Access**: AI has direct access to all knowledge via context (refreshes every minute)
- **Intelligent Escalation**: Escalates when questions aren't covered in its knowledge
- **Automatic Learning**: Supervisor responses expand the AI's knowledge automatically
- **Help Request Creation**: Escalated queries stored in database via `/api/help-requests`
- **Duplicate Prevention**: Checks for similar pending requests before escalating

### Webhook System

- **HTTP Server**: Runs on port 8080 to receive supervisor responses
- **Real-time Updates**: Delivers supervisor answers back to callers immediately
- **Security**: HMAC-SHA256 signature verification for webhook authenticity
- **Health Monitoring**: Health check endpoint at `/health`

## 🧪 Testing Methods

### 1. Web Interface Testing (Recommended)

Navigate to `http://localhost:3000` for the comprehensive test interface featuring:

- **Voice Input**: Click microphone button for continuous voice recognition
- **Text Input**: Type messages with quick test question buttons
- **Real-time Feedback**: Toast notifications for all operations
- **Conversation History**: Visual chat-like interface with timestamps
- **API Response Viewer**: See raw JSON responses for debugging

### 2. Console Mode Testing

```bash
python voice_agent.py console
```

- Type messages to test the agent's responses
- Great for debugging and development
- No voice required - text-based interaction

### 2. Local Audio Testing

```bash
python voice_agent.py dev --local-audio
```

- Uses your computer's microphone and speakers
- Real voice interaction testing
- Perfect for development

### 3. LiveKit Dashboard Testing

1. Go to https://cloud.livekit.io
2. Navigate to your project: `frontdesk-if5oz8if`
3. Create a test room
4. Connect the agent to the room
5. Join the room from the dashboard to test

### 4. Comprehensive Testing

```bash
# Run complete test suite (make sure backend is running)
python test_agent_comprehensive.py
```

This comprehensive test includes:

- Backend API connectivity
- Knowledge search functionality
- Help request creation and escalation
- Supervisor resolution workflow
- AI knowledge automatic updates
- Webhook delivery testing
- Dashboard visibility checks
- System health monitoring

### 5. Individual Component Testing

```bash
# Test webhook receiver (run this after starting the agent)
python test_webhook.py

# Test escalation functionality
python test_escalation_direct.py

# Debug knowledge content
python debug_knowledge_base.py
```

### 6. Phone Integration (Advanced)

- Connect through SIP providers like Twilio
- Requires additional configuration
- See LiveKit SIP documentation

## 🔧 Configuration

### Environment Variables

- `LIVEKIT_URL` - Your LiveKit WebSocket URL
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `GOOGLE_API_KEY` - For Gemini (optional, using OpenAI for now)
- `DEEPGRAM_API_KEY` - For speech-to-text
- `ELEVEN_API_KEY` - For text-to-speech
- `BACKEND_API_URL` - Your Node.js API URL (http://localhost:3000)
- `CONFIDENCE_THRESHOLD` - Escalation threshold (0.7)

### Customization

- Edit the agent instructions in `voice_agent.py`
- Add new function tools for specific business needs
- Modify the escalation logic
- Change voice settings (voice, model, etc.)

## 🎙️ Voice Settings

### Current Configuration

- **Voice**: Adam (Professional male voice)
- **TTS Model**: eleven_turbo_v2 (Fast, high-quality)
- **STT Model**: nova-2 (Deepgram's latest)
- **LLM**: GPT-4o-mini (Fast, cost-effective)

### Available Voices (ElevenLabs)

- Adam - Professional male
- Bella - Friendly female
- Charlie - Casual male
- Dorothy - Mature female

Change the voice in `voice_agent.py`:

```python
tts=elevenlabs.TTS(
    voice="Bella",  # Change this
    model="eleven_turbo_v2",
),
```

## 📊 Monitoring

### Logs

The agent provides detailed logging:

- Connection status
- Voice processing events
- Knowledge base queries
- Escalation events
- Error handling

### Dashboard Integration

- All escalated queries appear in your web dashboard
- Supervisors can resolve queries in real-time
- Resolutions are sent back to active calls

## 🔄 Development Workflow

1. **Start your backend services**:

   ```bash
   # Terminal 1: Database
   docker-compose up postgres -d

   # Terminal 2: Web app
   npm run dev

   # Terminal 3: Node.js agent (optional)
   cd agent && npm run dev
   ```

2. **Start the Python voice agent**:

   ```bash
   # Terminal 4: Python agent
   cd python-agent

   # Activate virtual environment first
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate

   # Run the agent
   python voice_agent.py console  # or 'dev' for LiveKit mode
   ```

3. **Test the interaction**:
   - Console mode: Type messages
   - LiveKit mode: Join room via dashboard
   - Check web dashboard for escalations

## 🚀 Production Deployment

### Docker Deployment

```bash
# Build the agent image
docker build -t voice-agent .

# Run with environment variables
docker run -d --env-file .env voice-agent
```

### Local Development Setup

```bash
# Complete setup from scratch
cd python-agent

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Test the setup
python test_agent_comprehensive.py
```

### Cloud Deployment

- Deploy to AWS, GCP, or Azure
- Use container orchestration (Kubernetes, ECS)
- Set up proper monitoring and logging
- Configure auto-scaling based on call volume

## 🎯 Next Steps

1. **Test the basic functionality** with console mode
2. **Try voice interaction** with dev mode
3. **Customize the agent** for your specific business needs
4. **Set up phone integration** for real calls
5. **Deploy to production** when ready

## 🆘 Troubleshooting

### Common Issues

1. **Agent won't start**:
   - Make sure virtual environment is activated
   - Check API keys in `.env`
   - Ensure backend is running on port 3000
   - Verify Python dependencies are installed: `pip list`

2. **No audio in console mode**:
   - Console mode is text-only
   - Use `dev` mode for audio testing

3. **Connection issues**:
   - Verify LiveKit credentials
   - Check network connectivity
   - Ensure ports are not blocked

4. **Poor voice quality**:
   - Check internet connection
   - Try different TTS voices
   - Adjust audio settings

### Getting Help

- Check the logs for detailed error messages
- Test individual components (STT, TTS, LLM)
- Verify API key permissions and quotas
- Check LiveKit dashboard for connection status

**Happy Voice Testing!** 🎉
