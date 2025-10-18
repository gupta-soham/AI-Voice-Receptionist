#!/usr/bin/env python3

import asyncio
import logging
import os
import aiohttp
import json
from typing import Optional, Dict, Any
from dotenv import load_dotenv

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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoiceReceptionistAgent:
    def __init__(self):
        self.backend_api_url = os.getenv("BACKEND_API_URL", "http://localhost:3000")
        self.confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.7"))
        self.webhook_secret = os.getenv("WEBHOOK_SECRET")
        self.agent_name = os.getenv("AGENT_NAME", "AI Voice Receptionist")
        
    async def query_knowledge_base(self, question: str, caller_id: Optional[str] = None) -> Dict[str, Any]:
        """Query the knowledge base via the backend API"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_api_url}/api/knowledge/search"
                params = {"q": question, "limit": 5}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get("entries"):
                            # Return the best match
                            best_match = data["entries"][0]
                            return {
                                "answer": best_match["answer"],
                                "confidence": 0.9,  # High confidence for knowledge base matches
                                "source": "knowledge_base"
                            }
                    
                    return {
                        "answer": None,
                        "confidence": 0.0,
                        "source": "none"
                    }
        except Exception as e:
            logger.error(f"Error querying knowledge base: {e}")
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
                    "callerId": caller_id,
                    "callerPhone": caller_phone,
                    "confidence": confidence,
                    "metadata": {
                        "agent": self.agent_name,
                        "escalated_at": asyncio.get_event_loop().time()
                    }
                }
                
                async with session.post(url, json=data) as response:
                    if response.status == 201:
                        result = await response.json()
                        return result.get("id")
                    else:
                        logger.error(f"Failed to create help request: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error creating help request: {e}")
            return None

# Define function tools for the agent
@function_tool
async def lookup_business_hours(context: RunContext) -> str:
    """Get business hours information"""
    return "Our business hours are Monday to Friday, 9 AM to 6 PM EST."

@function_tool
async def lookup_contact_info(context: RunContext) -> str:
    """Get contact information"""
    return "You can reach us at (555) 123-4567 or email us at info@company.com"

@function_tool
async def check_appointment_availability(context: RunContext, date: str = "today") -> str:
    """Check appointment availability for a given date"""
    return f"I can help you check availability for {date}. Let me connect you with our scheduling team."

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent"""
    await ctx.connect()
    
    # Initialize our custom agent
    voice_agent = VoiceReceptionistAgent()
    
    logger.info(f"🎙️ Starting {voice_agent.agent_name}")
    logger.info(f"🔗 Connected to room: {ctx.room.name}")
    
    # Create the agent with instructions
    agent = Agent(
        instructions=f"""You are {voice_agent.agent_name}, a helpful and professional AI voice receptionist.

Your role:
- Greet callers warmly and professionally
- Answer questions about business hours, services, and general information
- Help with appointment scheduling and inquiries
- If you're not confident about an answer (confidence < {voice_agent.confidence_threshold}), politely let the caller know you'll connect them with a human supervisor
- Keep responses concise and conversational
- Always be polite, helpful, and professional

Available tools:
- lookup_business_hours: Get business operating hours
- lookup_contact_info: Get contact information
- check_appointment_availability: Check appointment slots

If you need to escalate to a human, say something like: "Let me connect you with one of our team members who can better assist you with that."
""",
        tools=[lookup_business_hours, lookup_contact_info, check_appointment_availability],
    )
    
    # Create the agent session with AI services
    session = AgentSession(
        vad=silero.VAD.load(),  # Voice Activity Detection
        stt=deepgram.STT(
            model="nova-2",
            language="en-US",
            smart_format=True,
            punctuate=True,
        ),
        llm=google.LLM(
            model="gemini-2.0-flash-exp",
            temperature=0.7,
        ),
        tts=elevenlabs.TTS(
            model="eleven_turbo_v2",
        ),
    )
    
    # Start the session
    await session.start(agent=agent, room=ctx.room)
    
    # Generate initial greeting
    await session.generate_reply(
        instructions=f"Greet the caller professionally as {voice_agent.agent_name} and ask how you can help them today."
    )
    
    logger.info("✅ Voice agent is ready and listening...")

if __name__ == "__main__":
    # Run the agent
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))