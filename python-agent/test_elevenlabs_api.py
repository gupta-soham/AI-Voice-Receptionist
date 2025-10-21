#!/usr/bin/env python3

import os
import asyncio
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_elevenlabs_api():
    """Test ElevenLabs API connectivity and quota"""
    api_key = os.getenv("ELEVEN_API_KEY")
    
    if not api_key:
        print("❌ ELEVEN_API_KEY not found in .env file")
        return False
    
    print(f"🔑 Testing ElevenLabs API key: {api_key[:10]}...")
    
    headers = {
        "Accept": "application/json",
        "xi-api-key": api_key
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test 1: Check user info and quota
            print("\n📊 Checking user info and quota...")
            async with session.get("https://api.elevenlabs.io/v1/user", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    subscription = data.get("subscription", {})
                    character_count = subscription.get("character_count", 0)
                    character_limit = subscription.get("character_limit", 0)
                    
                    print(f"✅ API key is valid!")
                    print(f"📈 Characters used: {character_count:,} / {character_limit:,}")
                    
                    if character_count >= character_limit:
                        print("⚠️ Character limit exceeded! This is likely causing the timeout.")
                        print("💡 Solutions:")
                        print("   1. Upgrade your ElevenLabs plan")
                        print("   2. Wait for quota reset")
                        print("   3. Use OpenAI TTS as fallback (set TTS_PROVIDER=openai)")
                        return False
                    else:
                        remaining = character_limit - character_count
                        print(f"✅ Quota OK - {remaining:,} characters remaining")
                elif response.status == 401:
                    print("❌ Invalid API key!")
                    print("💡 Please check your ELEVEN_API_KEY in the .env file")
                    return False
                else:
                    print(f"❌ API error: {response.status}")
                    error_text = await response.text()
                    print(f"Error details: {error_text}")
                    return False
            
            # Test 2: Check available voices
            print("\n🎤 Checking available voices...")
            async with session.get("https://api.elevenlabs.io/v1/voices", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    voices = data.get("voices", [])
                    print(f"✅ Found {len(voices)} available voices:")
                    for voice in voices[:5]:  # Show first 5 voices
                        print(f"   - {voice['name']} ({voice['voice_id']})")
                    if len(voices) > 5:
                        print(f"   ... and {len(voices) - 5} more")
                else:
                    print(f"❌ Could not fetch voices: {response.status}")
            
            # Test 3: Small synthesis test
            print("\n🧪 Testing text synthesis...")
            test_text = "Hello, this is a test."
            voice_id = "pNInz6obpgDQGcFmaJgB"  # Adam voice
            
            synthesis_data = {
                "text": test_text,
                "model_id": "eleven_turbo_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            
            async with session.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={**headers, "Content-Type": "application/json"},
                json=synthesis_data,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as response:
                if response.status == 200:
                    audio_data = await response.read()
                    print(f"✅ Synthesis successful! Generated {len(audio_data)} bytes of audio")
                    return True
                else:
                    print(f"❌ Synthesis failed: {response.status}")
                    error_text = await response.text()
                    print(f"Error details: {error_text}")
                    return False
                    
    except asyncio.TimeoutError:
        print("❌ Request timed out - this might be a network issue")
        print("💡 Try again or check your internet connection")
        return False
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return False

async def main():
    print("🧪 ElevenLabs API Test")
    print("=" * 50)
    
    success = await test_elevenlabs_api()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ ElevenLabs API is working correctly!")
        print("💡 You can now run: python voice_agent.py console")
    else:
        print("❌ ElevenLabs API test failed")
        print("\n💡 Recommended solutions:")
        print("1. Check your API key in .env file")
        print("2. Verify your ElevenLabs quota")
        print("3. Use OpenAI TTS fallback:")
        print("   - Set TTS_PROVIDER=openai in .env")
        print("   - Add your OPENAI_API_KEY to .env")
        print("4. Try running: python voice_agent.py --verbose console")

if __name__ == "__main__":
    asyncio.run(main())