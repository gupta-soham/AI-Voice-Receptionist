#!/usr/bin/env python3

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def main():
    print("🎙️ Setting up LiveKit Voice Agent...")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Install requirements
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies. Please check your Python environment.")
        sys.exit(1)
    
    # Check if .env file exists
    if not os.path.exists(".env"):
        print("❌ .env file not found. Please create it with your API keys.")
        sys.exit(1)
    
    print("✅ .env file found")
    
    # Test import of main dependencies
    try:
        import livekit.agents
        import livekit.plugins.deepgram
        import livekit.plugins.elevenlabs
        print("✅ All dependencies imported successfully")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please run: pip install -r requirements.txt")
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\n🚀 Next steps:")
    print("1. Make sure your Node.js backend is running on http://localhost:3000")
    print("2. Test the agent in console mode:")
    print("   python voice_agent.py console")
    print("3. Or run in LiveKit mode:")
    print("   python voice_agent.py dev")
    print("\n📚 See README.md for more details")

if __name__ == "__main__":
    main()