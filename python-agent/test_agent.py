#!/usr/bin/env python3

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_backend_connection():
    """Test connection to the Node.js backend"""
    try:
        import aiohttp
        backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3000")
        
        async with aiohttp.ClientSession() as session:
            # Test health endpoint
            async with session.get(f"{backend_url}/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Backend connection successful")
                    print(f"   Status: {data.get('status')}")
                    print(f"   Database: {'✅' if data.get('database', {}).get('connected') else '❌'}")
                    return True
                else:
                    print(f"❌ Backend health check failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

async def test_knowledge_base():
    """Test knowledge base query"""
    try:
        import aiohttp
        backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3000")
        
        async with aiohttp.ClientSession() as session:
            # Test knowledge base search
            params = {"q": "business hours", "limit": 1}
            async with session.get(f"{backend_url}/api/knowledge/search", params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    entries = data.get("entries", [])
                    print(f"✅ Knowledge base query successful")
                    print(f"   Found {len(entries)} entries")
                    if entries:
                        print(f"   Sample: {entries[0].get('question', 'N/A')}")
                    return True
                else:
                    print(f"❌ Knowledge base query failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Knowledge base test failed: {e}")
        return False

def test_environment():
    """Test environment variables"""
    required_vars = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY", 
        "LIVEKIT_API_SECRET",
        "DEEPGRAM_API_KEY",
        "ELEVEN_API_KEY",
        "BACKEND_API_URL",
        "GOOGLE_API_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def test_imports():
    """Test that all required packages can be imported"""
    packages = [
        ("livekit.agents", "LiveKit Agents"),
        ("livekit.plugins.deepgram", "Deepgram plugin"),
        ("livekit.plugins.elevenlabs", "ElevenLabs plugin"),
        ("livekit.plugins.silero", "Silero VAD plugin"),
        ("google.genai", "Google GenAI SDK"),
        ("aiohttp", "HTTP client"),
        ("dotenv", "Environment loader")
    ]
    
    failed_imports = []
    for package, name in packages:
        try:
            __import__(package)
            print(f"✅ {name} imported successfully")
        except ImportError as e:
            print(f"❌ {name} import failed: {e}")
            failed_imports.append(package)
    
    return len(failed_imports) == 0

async def main():
    print("🧪 Testing LiveKit Voice Agent Setup")
    print("=" * 50)
    
    # Test 1: Environment variables
    print("\n1. Testing environment variables...")
    env_ok = test_environment()
    
    # Test 2: Package imports
    print("\n2. Testing package imports...")
    imports_ok = test_imports()
    
    # Test 3: Backend connection
    print("\n3. Testing backend connection...")
    backend_ok = await test_backend_connection()
    
    # Test 4: Knowledge base
    print("\n4. Testing knowledge base...")
    kb_ok = await test_knowledge_base()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    print(f"   Environment: {'✅' if env_ok else '❌'}")
    print(f"   Imports: {'✅' if imports_ok else '❌'}")
    print(f"   Backend: {'✅' if backend_ok else '❌'}")
    print(f"   Knowledge Base: {'✅' if kb_ok else '❌'}")
    
    if all([env_ok, imports_ok, backend_ok, kb_ok]):
        print("\n🎉 All tests passed! Your agent is ready to run.")
        print("\n🚀 Try running:")
        print("   python voice_agent.py console")
    else:
        print("\n❌ Some tests failed. Please fix the issues above.")
        print("\n💡 Common fixes:")
        print("   - Make sure your Node.js backend is running")
        print("   - Check your .env file has all required API keys")
        print("   - Run: pip install -r requirements.txt")

if __name__ == "__main__":
    asyncio.run(main())