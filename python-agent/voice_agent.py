#!/usr/bin/env python3

import asyncio
import logging
import os
import aiohttp
import json
import hmac
import hashlib
import sys
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from aiohttp import web, ClientSession
import threading

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import deepgram, elevenlabs, silero, google
from livekit.agents.llm import LLM, LLMStream, ChatMessage, ChatRole

# Load environment variables
load_dotenv()

# Using official Google plugin for Gemini integration

# Configure logging based on verbose flag
def setup_logging(verbose: bool = False):
    """Setup logging configuration based on verbosity level"""
    if verbose:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        # Enable debug logging for LiveKit components in verbose mode
        logging.getLogger("livekit").setLevel(logging.INFO)
    else:
        logging.basicConfig(
            level=logging.WARNING,
            format='%(levelname)s: %(message)s'
        )
        # Suppress most LiveKit logs in normal mode
        logging.getLogger("livekit").setLevel(logging.ERROR)
        logging.getLogger("aiohttp").setLevel(logging.ERROR)
        logging.getLogger("deepgram").setLevel(logging.ERROR)
        logging.getLogger("elevenlabs").setLevel(logging.ERROR)

# Check for verbose flag and remove it from sys.argv before LiveKit CLI processes it
verbose_args = ["--verbose", "-v", "--debug"]
verbose_mode = (
    os.getenv("VERBOSE", "").lower() in ["true", "1", "yes"] or
    any(arg in sys.argv for arg in verbose_args)
)

# Remove verbose flags from sys.argv so LiveKit CLI doesn't see them
original_argv = sys.argv.copy()
sys.argv = [arg for arg in sys.argv if arg not in verbose_args]

setup_logging(verbose_mode)

logger = logging.getLogger(__name__)

# Global variables for webhook handling
active_sessions = {}
webhook_app = None

class VoiceReceptionistAgent:
    def __init__(self):
        self.backend_api_url = os.getenv("BACKEND_API_URL", "http://localhost:3000")
        self.confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.7"))
        self.webhook_secret = os.getenv("WEBHOOK_SECRET")
        self.agent_name = os.getenv("AGENT_NAME", "AI Voice Receptionist")
        self.webhook_port = int(os.getenv("WEBHOOK_PORT", "8080"))
        self.pending_requests = {}  # Track pending help requests
        self.knowledge_base_content = ""  # Cache knowledge base content
        self.last_knowledge_update = 0  # Track last update time
        self.knowledge_refresh_interval = 60  # Refresh every 1 minute
        self.pending_help_requests = []  # Cache pending help requests
        self.last_help_requests_update = 0  # Track last help requests update
        self.help_requests_refresh_interval = 45  # Refresh every 45 seconds
        
    async def load_knowledge_base(self, force_refresh: bool = False) -> str:
        """Load the entire knowledge base and format it for LLM context"""
        current_time = asyncio.get_event_loop().time()
        
        # Check if we need to refresh (forced, first load, or interval passed)
        if (force_refresh or 
            not self.knowledge_base_content or 
            current_time - self.last_knowledge_update > self.knowledge_refresh_interval):
            
            try:
                async with aiohttp.ClientSession() as session:
                    url = f"{self.backend_api_url}/api/knowledge"
                    params = {"limit": 100}  # Get all knowledge entries
                    
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            entries = data.get("items", [])
                            
                            if entries:
                                knowledge_text = "KNOWLEDGE BASE:\n\n"
                                for entry in entries:
                                    knowledge_text += f"Q: {entry['question']}\n"
                                    knowledge_text += f"A: {entry['answer']}\n\n"
                                
                                self.knowledge_base_content = knowledge_text
                                self.last_knowledge_update = current_time
                                if verbose_mode:
                                    logger.info(f"📚 {'Refreshed' if force_refresh else 'Loaded'} {len(entries)} knowledge base entries")
                                else:
                                    print(f"📚 Knowledge base {'refreshed' if force_refresh else 'loaded'}: {len(entries)} entries")
                                return knowledge_text
                            else:
                                if verbose_mode:
                                    logger.info("📚 No knowledge base entries found")
                                fallback = "KNOWLEDGE BASE: Empty"
                                self.knowledge_base_content = fallback
                                self.last_knowledge_update = current_time
                                return fallback
                        else:
                            logger.warning(f"Knowledge base API returned status {response.status}")
                            # Return cached content if available, otherwise error message
                            return self.knowledge_base_content or "KNOWLEDGE BASE: Unavailable"
            except Exception as e:
                logger.error(f"Error loading knowledge base: {e}")
                # Return cached content if available, otherwise error message
                return self.knowledge_base_content or "KNOWLEDGE BASE: Error loading"
        else:
            # Return cached content
            logger.debug("📚 Using cached knowledge base content")
            return self.knowledge_base_content

    async def refresh_knowledge_base_periodically(self):
        """Background task to periodically refresh knowledge base every 60 seconds"""
        while True:
            try:
                await asyncio.sleep(self.knowledge_refresh_interval)
                await self.load_knowledge_base(force_refresh=True)
            except asyncio.CancelledError:
                if verbose_mode:
                    logger.info("📚 Knowledge base refresh task cancelled")
                else:
                    print("📚 KB refresh task stopped")
                break
            except Exception as e:
                logger.error(f"Error in knowledge base refresh: {e}")
                print(f"⚠️  KB refresh error: {e}")
                await asyncio.sleep(30)  # Wait before retrying

    async def refresh_help_requests_periodically(self):
        """Background task to periodically refresh help requests every 45 seconds"""
        while True:
            try:
                await asyncio.sleep(self.help_requests_refresh_interval)
                await self.load_pending_help_requests(force_refresh=True)
            except asyncio.CancelledError:
                if verbose_mode:
                    logger.info("📋 Help requests refresh task cancelled")
                else:
                    print("📋 HR refresh task stopped")
                break
            except Exception as e:
                logger.error(f"Error in help requests refresh: {e}")
                print(f"⚠️  HR refresh error: {e}")
                await asyncio.sleep(30)  # Wait before retrying

    async def load_pending_help_requests(self, force_refresh: bool = False) -> list:
        """Load pending help requests to check for duplicates"""
        current_time = asyncio.get_event_loop().time()
        
        # Check if we need to refresh
        if (force_refresh or 
            not self.pending_help_requests or 
            current_time - self.last_help_requests_update > self.help_requests_refresh_interval):
            
            try:
                async with aiohttp.ClientSession() as session:
                    url = f"{self.backend_api_url}/api/help-requests"
                    params = {"status": "PENDING", "limit": 50}
                    
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            requests = data.get("items", [])
                            
                            self.pending_help_requests = requests
                            self.last_help_requests_update = current_time
                            if verbose_mode:
                                logger.info(f"📋 Loaded {len(requests)} pending help requests")
                            else:
                                print(f"📋 Help requests refreshed: {len(requests)} pending")
                            return requests
                        else:
                            logger.warning(f"Help requests API returned status {response.status}")
                            return self.pending_help_requests or []
            except Exception as e:
                logger.error(f"Error loading pending help requests: {e}")
                return self.pending_help_requests or []
        else:
            # Return cached requests
            if verbose_mode:
                logger.debug("📋 Using cached pending help requests")
            return self.pending_help_requests

    def check_duplicate_request(self, question: str, caller_id: str) -> dict:
        """Check if a similar help request already exists"""
        question_lower = question.lower()
        question_words = set(question_lower.split())
        
        for request in self.pending_help_requests:
            existing_question = request.get("question", "").lower()
            existing_caller = request.get("callerId", "")
            existing_words = set(existing_question.split())
            
            # Check for same caller with similar question
            if existing_caller == caller_id:
                # Calculate word overlap
                common_words = question_words.intersection(existing_words)
                if len(common_words) >= 2:  # At least 2 common words
                    return {
                        "is_duplicate": True,
                        "existing_request": request,
                        "similarity_score": len(common_words) / len(question_words.union(existing_words))
                    }
            
            # Check for very similar questions from any caller
            common_words = question_words.intersection(existing_words)
            similarity = len(common_words) / len(question_words.union(existing_words))
            if similarity > 0.7:  # 70% similarity threshold
                return {
                    "is_duplicate": True,
                    "existing_request": request,
                    "similarity_score": similarity
                }
        
        return {"is_duplicate": False}

    async def query_knowledge_base(self, question: str, caller_id: Optional[str] = None) -> Dict[str, Any]:
        """This method is now deprecated - knowledge is loaded directly into LLM context"""
        # Still provide fallback API search for edge cases
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_api_url}/api/knowledge/search"
                params = {"q": question, "limit": 5}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get("results", [])
                        if results and len(results) > 0:
                            best_match = results[0]
                            relevance_score = best_match.get("relevanceScore", 0)
                            confidence = min(0.95, max(0.6, relevance_score / 10))
                            
                            if verbose_mode:
                                logger.info(f"📚 Fallback API search found match: score={relevance_score}")
                            return {
                                "answer": best_match["answer"],
                                "confidence": confidence,
                                "source": "knowledge_base_api",
                                "question_matched": best_match["question"]
                            }
                        else:
                            if verbose_mode:
                                logger.info(f"📚 No API matches found for: '{question}'")
                            return {
                                "answer": None,
                                "confidence": 0.0,
                                "source": "none"
                            }
                    else:
                        logger.warning(f"Knowledge base API returned status {response.status}")
                        return {
                            "answer": None,
                            "confidence": 0.0,
                            "source": "api_error"
                        }
        except Exception as e:
            logger.error(f"Error in fallback API search: {e}")
            return {
                "answer": None,
                "confidence": 0.0,
                "source": "error"
            }
    
    async def create_help_request(self, question: str, caller_id: Optional[str] = None, 
                                caller_phone: Optional[str] = None, confidence: float = 0.0) -> Optional[str]:
        """Create a help request for escalation"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_api_url}/api/help-requests"
                data = {
                    "question": question,
                    "metadata": {
                        "agent": self.agent_name,
                        "escalated_at": asyncio.get_event_loop().time(),
                        "confidence": confidence
                    }
                }
                
                # Only include optional fields if they have values
                if caller_id:
                    data["callerId"] = caller_id
                if caller_phone:
                    data["callerPhone"] = caller_phone
                
                async with session.post(url, json=data) as response:
                    if response.status == 201:
                        result = await response.json()
                        request_id = result.get("id")
                        
                        # Store pending request for webhook handling
                        if request_id and caller_id:
                            self.pending_requests[request_id] = {
                                "caller_id": caller_id,
                                "caller_phone": caller_phone,
                                "question": question,
                                "created_at": asyncio.get_event_loop().time()
                            }
                            if verbose_mode:
                                logger.info(f"📝 Created help request {request_id} for caller {caller_id}")
                        
                        return request_id
                    else:
                        logger.error(f"Failed to create help request: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error creating help request: {e}")
            return None

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature for security"""
        if not self.webhook_secret:
            logger.warning("No webhook secret configured, skipping signature verification")
            return True
            
        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Remove 'sha256=' prefix if present
        if signature.startswith('sha256='):
            signature = signature[7:]
            
        return hmac.compare_digest(expected_signature, signature)

    async def handle_resolved_request(self, request_data: Dict[str, Any]) -> None:
        """Handle a resolved help request from supervisor"""
        request_id = request_data.get("requestId")
        answer = request_data.get("answer")
        caller_id = request_data.get("callerId")
        
        if verbose_mode:
            logger.info(f"📞 Received resolution for request {request_id}")
        
        # Check if we have this request pending
        if request_id in self.pending_requests:
            pending_info = self.pending_requests[request_id]
            
            # Find active session for this caller
            if caller_id in active_sessions:
                session = active_sessions[caller_id]
                try:
                    # Send the answer back to the caller
                    await session.generate_reply(
                        instructions=f"The supervisor has provided this answer to the caller's question: {answer}. "
                                   f"Deliver this answer naturally and ask if there's anything else you can help with."
                    )
                    print(f"✅ Delivered answer to caller {caller_id}")
                except Exception as e:
                    logger.error(f"Error delivering answer to caller: {e}")
            else:
                if verbose_mode:
                    logger.warning(f"No active session found for caller {caller_id}")
            
            # Remove from pending requests
            del self.pending_requests[request_id]
        else:
            if verbose_mode:
                logger.warning(f"Received resolution for unknown request {request_id}")
        
        # Refresh knowledge base since supervisor may have added new knowledge
        if verbose_mode:
            logger.info("📚 Refreshing knowledge base after supervisor resolution")
        await self.load_knowledge_base(force_refresh=True)

# Webhook server handlers
async def webhook_handler(request):
    """Handle incoming webhooks from the backend"""
    try:
        # Verify signature
        signature = request.headers.get('X-Webhook-Signature', '')
        payload = await request.read()
        
        # Get the agent instance (we'll need to pass this somehow)
        # For now, we'll create a new instance
        agent = VoiceReceptionistAgent()
        
        if not agent.verify_webhook_signature(payload, signature):
            logger.error("Invalid webhook signature")
            return web.Response(status=401, text="Invalid signature")
        
        # Parse the payload
        data = json.loads(payload.decode())
        webhook_type = data.get("type")
        
        if webhook_type == "help_request_resolved":
            await agent.handle_resolved_request(data)
            return web.json_response({"status": "received", "requestId": data.get("requestId")})
        else:
            logger.warning(f"Unknown webhook type: {webhook_type}")
            return web.Response(status=400, text="Unknown webhook type")
            
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return web.Response(status=500, text="Internal server error")

async def health_handler(request):
    """Health check endpoint for the webhook server"""
    return web.json_response({
        "status": "healthy",
        "service": "ai-voice-agent-webhook",
        "timestamp": asyncio.get_event_loop().time()
    })

def start_webhook_server(port: int = 8080):
    """Start the webhook server in a separate thread"""
    global webhook_app
    
    webhook_app = web.Application()
    webhook_app.router.add_post('/webhook', webhook_handler)
    webhook_app.router.add_get('/health', health_handler)
    
    def run_server():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def start_server():
            runner = web.AppRunner(webhook_app)
            await runner.setup()
            site = web.TCPSite(runner, 'localhost', port)
            await site.start()
            if verbose_mode:
                logger.info(f"🔗 Webhook server started on http://localhost:{port}")
            else:
                print(f"🔗 Webhook server ready on port {port}")
            
            # Keep the server running
            try:
                await asyncio.Future()  # Run forever
            except asyncio.CancelledError:
                await runner.cleanup()
        
        loop.run_until_complete(start_server())
    
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    return server_thread

# Global agent instance for function tools
_agent_instance = None

# Define function tools for the agent
@function_tool
async def ask_for_clarification(context: RunContext, unclear_part: str) -> str:
    """Ask the user to clarify or rephrase their question when it's unclear"""
    if verbose_mode:
        logger.info(f"🤔 ASKING FOR CLARIFICATION: {unclear_part}")
    else:
        print(f"🤔 Asking for clarification about: {unclear_part}")
    
    clarification_messages = [
        f"I want to make sure I understand your question correctly. Could you please rephrase what you're asking about {unclear_part}?",
        f"I'm not quite sure I understood your question about {unclear_part}. Could you please clarify what you're looking for?",
        f"To better assist you, could you please rephrase your question about {unclear_part}? I want to make sure I give you the right information.",
        f"I want to help you with your question about {unclear_part}, but I need a bit more clarity. Could you please rephrase that for me?"
    ]
    
    import random
    return random.choice(clarification_messages)

@function_tool
async def escalate_to_supervisor(context: RunContext, question: str, reason: str = "Unable to find answer in knowledge base") -> str:
    """Escalate a question to human supervisor when the LLM cannot answer from the knowledge base"""
    global _agent_instance
    
    if verbose_mode:
        logger.info(f"🚨 ESCALATION TRIGGERED!")
        logger.info(f"   Question: {question}")
        logger.info(f"   Reason: {reason}")
    else:
        print(f"🚨 Escalating question to supervisor")
    
    if not _agent_instance:
        logger.error("❌ Agent instance not available for escalation")
        return "I'm having trouble accessing our system. Please try calling back in a few minutes."
    
    try:
        caller_id = getattr(context, 'room_name', f'console_caller_{asyncio.get_event_loop().time()}')
        if verbose_mode:
            logger.info(f"   Caller ID: {caller_id}")
        
        # Load pending help requests to check for duplicates
        await _agent_instance.load_pending_help_requests()
        duplicate_check = _agent_instance.check_duplicate_request(question, caller_id)
        
        if duplicate_check["is_duplicate"]:
            existing_request = duplicate_check["existing_request"]
            similarity = duplicate_check["similarity_score"]
            if verbose_mode:
                logger.info(f"🔄 Duplicate request detected (similarity: {similarity:.2f})")
                logger.info(f"   Existing request ID: {existing_request['id']}")
            else:
                print(f"🔄 Similar question already pending")
            
            return ("I see you've asked a similar question recently, and I've already forwarded it to my supervisor. "
                   "They'll get back to you shortly with an answer. In the meantime, do you have any other questions I can help you with?")
        
        # Create new help request
        request_id = await _agent_instance.create_help_request(
            question=question,
            caller_id=caller_id,
            confidence=0.0  # Low confidence since we're escalating
        )
        
        if request_id:
            if verbose_mode:
                logger.info(f"✅ Successfully escalated to supervisor!")
                logger.info(f"   Request ID: {request_id}")
                logger.info(f"   Check dashboard: http://localhost:3000/dashboard")
            else:
                print(f"✅ Question escalated (ID: {request_id})")
            
            escalation_messages = [
                "Let me check with my supervisor and get back to you with that information. Please hold on for just a moment - I'll have an answer for you shortly. In the meantime, do you have any other questions I can help you with?",
                "I'm going to connect with my supervisor to get you the most accurate information about that. Please give me just a moment, and I'll get back to you. While I'm checking on that, is there anything else I can assist you with?",
                "Let me reach out to my supervisor for the details on that question. I'll get back to you very soon with a complete answer. In the meantime, feel free to ask me about anything else I can help you with!"
            ]
            
            import random
            return random.choice(escalation_messages)
        else:
            logger.error("❌ Failed to create help request for escalation")
            return "I'm having trouble accessing our system right now. Please try calling back in a few minutes, or you can reach us directly at our main number."
            
    except Exception as e:
        logger.error(f"❌ Error escalating to supervisor: {e}")
        return "I'm having trouble connecting with my supervisor right now. Please try calling back in a few minutes."

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent"""
    await ctx.connect()
    
    # Initialize our custom agent
    voice_agent = VoiceReceptionistAgent()
    
    # Set global agent instance for function tools
    global _agent_instance
    _agent_instance = voice_agent
    
    # Start webhook server
    webhook_thread = start_webhook_server(voice_agent.webhook_port)
    
    if verbose_mode:
        logger.info(f"🎙️ Starting {voice_agent.agent_name}")
        logger.info(f"🔗 Connected to room: {ctx.room.name}")
    else:
        print(f"🎙️ {voice_agent.agent_name} starting...")
        print(f"🔗 Connected to room: {ctx.room.name}")
    
    # Load knowledge base and pending help requests for LLM context
    knowledge_base_content = await voice_agent.load_knowledge_base()
    await voice_agent.load_pending_help_requests()
    
    # Track this session globally for webhook handling
    caller_id = ctx.room.name or f"console_caller_{asyncio.get_event_loop().time()}"
    
    # Create the agent with instructions including knowledge base
    agent = Agent(
        instructions=f"""You are {voice_agent.agent_name}, a helpful and professional AI voice receptionist.

{knowledge_base_content}

Your role:
- Greet callers warmly and professionally
- Answer questions using the knowledge base provided above
- Help with appointment scheduling and inquiries using the information you have
- If you're not confident about an answer (confidence < {voice_agent.confidence_threshold}), politely let the caller know you'll connect them with a human supervisor
- Keep responses concise and conversational
- Always be polite, helpful, and professional

IMPORTANT INSTRUCTIONS:
1. First try to answer questions using the KNOWLEDGE BASE provided above
2. Look for semantically similar questions, not just exact matches
3. If you cannot find a relevant answer in the knowledge base, use the escalate_to_supervisor tool
4. Do NOT make up information that's not in the knowledge base
5. Be confident when you have the information, but escalate when you don't

🎯 INTELLIGENT RESPONSE STRATEGY 🎯

FOR EVERY CUSTOMER INTERACTION, FOLLOW THIS PROCESS:

1️⃣ **UNDERSTAND THE QUESTION**
   - If the question is unclear or ambiguous → USE ask_for_clarification tool
   - If you understand the question clearly → Proceed to step 2

2️⃣ **CHECK MY KNOWLEDGE**
   - Look for EXACT matches in my knowledge above
   - If you find a direct, specific answer → Respond confidently
   - If NO exact match or ANY uncertainty → USE escalate_to_supervisor tool

3️⃣ **ESCALATION SCENARIOS** (MUST use escalate_to_supervisor):
   - Dental/medical/other treatments (we're a beauty salon)
   - Services not explicitly covered in my knowledge
   - Specific policies not covered in my comprehension
   - Technical issues, weather, taxes, or non-salon topics
   - ANY question where you're not 100% certain

4️⃣ **CLARIFICATION SCENARIOS** (MUST use ask_for_clarification):
   - Vague questions like "Can you help me?"
   - Unclear service requests
   - Questions with missing context
   - When you're unsure what the customer is asking

Available tools:
- ask_for_clarification: Use when questions are unclear or need more context
- escalate_to_supervisor: Use when you cannot find exact answers in my knowledge

🎯 GOAL: Provide excellent customer service through clear communication and accurate information 🎯
""",
        tools=[ask_for_clarification, escalate_to_supervisor],
    )
    
    # Create the agent session with AI services and better error handling
    session = AgentSession(
        vad=silero.VAD.load(),  # Voice Activity Detection
        stt=deepgram.STT(
            model="nova-2",
            language="en-US",
            smart_format=True,
            punctuate=True,
            interim_results=True,  # Enable interim results for better responsiveness
        ),
        llm=google.LLM(
            model="gemini-2.0-flash-lite",  # Use the more stable model
            temperature=0.7,
        ),
        tts=elevenlabs.TTS(
            model="eleven_turbo_v2",
        ),
    )
    
    # Store session globally for webhook access
    active_sessions[caller_id] = session
    
    # Start both periodic refresh tasks independently
    kb_refresh_task = asyncio.create_task(voice_agent.refresh_knowledge_base_periodically())
    hr_refresh_task = asyncio.create_task(voice_agent.refresh_help_requests_periodically())
    
    # Start the session
    await session.start(agent=agent, room=ctx.room)
    
    # Generate initial greeting
    await session.generate_reply(
        instructions=f"Greet the caller professionally as {voice_agent.agent_name} and ask how you can help them today. Remember to escalate any questions not directly covered in your knowledge."
    )
    
    print("✅ Voice agent is ready and listening...")
    
    # Clean up session when done
    try:
        await asyncio.Future()  # Keep running
    except asyncio.CancelledError:
        # Cancel both refresh tasks
        kb_refresh_task.cancel()
        hr_refresh_task.cancel()
        try:
            await kb_refresh_task
        except asyncio.CancelledError:
            pass
        try:
            await hr_refresh_task
        except asyncio.CancelledError:
            pass
        
        if caller_id in active_sessions:
            del active_sessions[caller_id]
        if verbose_mode:
            logger.info(f"🔚 Session ended for caller {caller_id}")
        else:
            print(f"🔚 Session ended")

if __name__ == "__main__":
    # Run the agent
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))