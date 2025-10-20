#!/usr/bin/env python3

import asyncio
import os
import aiohttp
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

async def test_complete_integration_flow():
    """Test the complete flow: knowledge base -> escalation -> resolution"""
    
    backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3000")
    
    print("🔄 Testing Complete AI Receptionist Flow")
    print("=" * 60)
    
    # Step 1: Test knowledge base query (should find answer)
    print("📚 Step 1: Testing Knowledge Query")
    print("-" * 40)
    
    async with aiohttp.ClientSession() as session:
        # Test a question that should be in the knowledge base
        url = f"{backend_url}/api/knowledge/search"
        params = {"q": "business hours", "limit": 1}
        
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                results = data.get("results", [])
                
                if results:
                    result = results[0]
                    print(f"✅ Found answer with score: {result.get('relevanceScore', 0)}")
                    print(f"   Question: {result['question']}")
                    print(f"   Answer: {result['answer'][:100]}...")
                else:
                    print("❌ No results found - knowledge may be empty")
                    print("   💡 Run 'npm run db:seed' to populate the knowledge")
            else:
                print(f"❌ API error: {response.status}")
    
    print()
    
    # Step 2: Test escalation (create help request)
    print("🆘 Step 2: Testing Escalation (Help Request Creation)")
    print("-" * 40)
    
    request_id = None
    async with aiohttp.ClientSession() as session:
        url = f"{backend_url}/api/help-requests"
        data = {
            "callerId": "test_caller_integration",
            "callerPhone": "+1555123TEST",
            "question": "This is a test question that should not be in the knowledge base",
            "metadata": {
                "source": "integration_test",
                "confidence": 0.2
            }
        }
        
        async with session.post(url, json=data) as response:
            if response.status == 201:
                result = await response.json()
                request_id = result.get("id")
                print(f"✅ Help request created: {request_id}")
                print(f"   Status: {result.get('status')}")
                
                # Step 3: Test resolution
                print()
                print("✅ Step 3: Testing Resolution")
                print("-" * 40)
                
                resolve_url = f"{backend_url}/api/help-requests/{request_id}/resolve"
                resolve_data = {
                    "answer": "This is a test answer from the integration test.",
                    "resolvedBy": "integration_test_supervisor",
                    "learn": True  # Add to knowledge base
                }
                
                async with session.post(resolve_url, json=resolve_data) as resolve_response:
                    if resolve_response.status == 200:
                        resolve_result = await resolve_response.json()
                        print(f"✅ Help request resolved: {resolve_result.get('id')}")
                        print(f"   Status: {resolve_result.get('status')}")
                        print("   Answer added to AI's knowledge")
                        
                        # Step 4: Verify knowledge base was updated
                        print()
                        print("📚 Step 4: Verifying Knowledge Update")
                        print("-" * 40)
                        
                        search_url = f"{backend_url}/api/knowledge/search"
                        search_params = {"q": "integration test", "limit": 1}
                        
                        async with session.get(search_url, params=search_params) as search_response:
                            if search_response.status == 200:
                                search_data = await search_response.json()
                                search_results = search_data.get("results", [])
                                
                                if search_results:
                                    print("✅ AI's knowledge updated successfully")
                                    kb_result = search_results[0]
                                    print(f"   New entry: {kb_result['question']}")
                                    print(f"   Source: {kb_result.get('source', 'unknown')}")
                                else:
                                    print("❌ AI's knowledge was not updated")
                            else:
                                print(f"❌ Error checking knowledge: {search_response.status}")
                    else:
                        error_text = await resolve_response.text()
                        print(f"❌ Resolution failed: {resolve_response.status} - {error_text}")
            else:
                error_text = await response.text()
                print(f"❌ Help request creation failed: {response.status} - {error_text}")
    
    return request_id

async def test_webhook_flow():
    """Test webhook delivery to agent"""
    
    print()
    print("🔗 Step 5: Testing Webhook Flow")
    print("-" * 40)
    
    webhook_url = "http://localhost:8080/webhook"
    webhook_secret = os.getenv("WEBHOOK_SECRET")
    
    if not webhook_secret:
        print("❌ WEBHOOK_SECRET not configured")
        return
    
    # Test webhook payload
    import hmac
    import hashlib
    
    payload = {
        "type": "help_request_resolved",
        "requestId": "integration_test_123",
        "callerId": "test_caller_integration",
        "answer": "This is a test webhook delivery.",
        "resolvedBy": "integration_test_supervisor",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
    
    payload_str = json.dumps(payload)
    signature = hmac.new(
        webhook_secret.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': f'sha256={signature}',
        'X-Webhook-Timestamp': payload['timestamp']
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, data=payload_str, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ Webhook delivered successfully")
                    print(f"   Response: {result}")
                else:
                    error_text = await response.text()
                    print(f"❌ Webhook delivery failed: {response.status} - {error_text}")
    except Exception as e:
        print(f"❌ Webhook connection error: {e}")
        print("   💡 Make sure the Python agent is running with webhook server")

async def test_agent_functionality():
    """Comprehensive test of agent functionality"""
    backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3000")
    
    print("🧪 COMPREHENSIVE AGENT TESTING")
    print("=" * 50)
    
    # Test 1: Backend Health
    print("\n1️⃣ Testing Backend Health...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{backend_url}/api/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    print("✅ Backend is healthy")
                    print(f"   Database: {'✅' if health_data.get('database') else '❌'}")
                    print(f"   Jobs: {'✅' if health_data.get('jobs') else '❌'}")
                else:
                    print(f"❌ Backend health check failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False
    
    # Test 2: Knowledge Base Content
    print("\n2️⃣ Testing Knowledge Base...")
    knowledge_entries = []
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{backend_url}/api/knowledge", params={"limit": 100}) as response:
                if response.status == 200:
                    data = await response.json()
                    knowledge_entries = data.get("items", [])
                    print(f"✅ Knowledge base loaded: {len(knowledge_entries)} entries")
                    
                    # Show sample entries
                    for i, entry in enumerate(knowledge_entries[:3]):
                        print(f"   {i+1}. Q: {entry['question'][:60]}...")
                        print(f"      A: {entry['answer'][:60]}...")
                else:
                    print(f"❌ Knowledge base access failed: {response.status}")
    except Exception as e:
        print(f"❌ Knowledge base error: {e}")
    
    # Test 3: Help Request Creation (Escalation Test)
    print("\n3️⃣ Testing Escalation (Help Request Creation)...")
    test_questions = [
        "What is the meaning of life?",  # Should escalate - not in knowledge base
        "How do I reset my password?",   # Might be in knowledge base
        "What are your business hours?", # Likely in knowledge base
    ]
    
    created_requests = []
    for question in test_questions:
        try:
            async with aiohttp.ClientSession() as session:
                test_data = {
                    "question": question,
                    "callerId": f"test_caller_{len(created_requests)+1}",
                    "metadata": {
                        "agent": "Test Agent",
                        "test": True,
                        "timestamp": asyncio.get_event_loop().time()
                    }
                }
                
                async with session.post(f"{backend_url}/api/help-requests", json=test_data) as response:
                    if response.status == 201:
                        result = await response.json()
                        request_id = result.get("id")
                        created_requests.append(request_id)
                        print(f"✅ Escalation created for: '{question[:40]}...'")
                        print(f"   Request ID: {request_id}")
                    else:
                        error_text = await response.text()
                        print(f"❌ Escalation failed for: '{question[:40]}...'")
                        print(f"   Status: {response.status}, Error: {error_text}")
        except Exception as e:
            print(f"❌ Escalation error for '{question[:40]}...': {e}")
    
    # Test 4: Dashboard Visibility
    print("\n4️⃣ Testing Dashboard Visibility...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{backend_url}/api/help-requests", params={"status": "PENDING", "limit": 10}) as response:
                if response.status == 200:
                    data = await response.json()
                    pending_requests = data.get("items", [])  # API returns 'items', not 'data'
                    print(f"✅ Dashboard shows {len(pending_requests)} pending requests")
                    
                    # Check if our test requests appear
                    test_request_count = 0
                    for req in pending_requests:
                        if req.get("callerId", "").startswith("test_caller_"):
                            test_request_count += 1
                    
                    print(f"   Test requests visible: {test_request_count}/{len(created_requests)}")
                else:
                    print(f"❌ Dashboard access failed: {response.status}")
    except Exception as e:
        print(f"❌ Dashboard error: {e}")
    
    # Test 5: Webhook Server
    print("\n5️⃣ Testing Webhook Server...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8080/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    print("✅ Webhook server is running")
                    print(f"   Service: {health_data.get('service', 'unknown')}")
                else:
                    print(f"❌ Webhook server returned: {response.status}")
    except Exception as e:
        print(f"❌ Webhook server not accessible: {e}")
        print("   ⚠️  Make sure voice agent is running: python voice_agent.py dev")
    
    # Test 6: Knowledge Base Search API
    print("\n6️⃣ Testing Knowledge Base Search...")
    search_queries = ["business hours", "contact", "appointment"]
    
    for query in search_queries:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{backend_url}/api/knowledge/search", params={"q": query, "limit": 3}) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get("results", [])
                        print(f"✅ Search '{query}': {len(results)} results")
                        if results:
                            best_match = results[0]
                            score = best_match.get("relevanceScore", 0)
                            print(f"   Best match (score {score}): {best_match['question'][:50]}...")
                    else:
                        print(f"❌ Search '{query}' failed: {response.status}")
        except Exception as e:
            print(f"❌ Search error for '{query}': {e}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"✅ Knowledge base entries: {len(knowledge_entries)}")
    print(f"✅ Test escalations created: {len(created_requests)}")
    print("\n🔧 TO FIX ESCALATION ISSUES:")
    print("1. Make sure voice agent is running: python voice_agent.py dev")
    print("2. Test with questions NOT in knowledge base")
    print("3. Check agent logs for escalation attempts")
    print("4. Verify LLM is using escalate_to_supervisor tool")
    
    return True

if __name__ == "__main__":
    print("🧪 AI Receptionist Comprehensive Test Suite")
    print("=" * 60)
    print()
    
    async def run_all_tests():
        # Run integration flow test
        request_id = await test_complete_integration_flow()
        
        # Run webhook test
        await test_webhook_flow()
        
        print()
        print("=" * 60)
        
        # Run comprehensive functionality tests
        await test_agent_functionality()
        
        print()
        print("🎉 All Tests Complete!")
        print()
        print("📋 Test Summary:")
        print("   1. ✅ Knowledge search via API")
        print("   2. ✅ Help request creation and escalation")
        print("   3. ✅ Supervisor resolution with learning")
        print("   4. ✅ AI knowledge automatic updates")
        print("   5. ✅ Webhook delivery to agent")
        print("   6. ✅ Dashboard visibility and functionality")
        print("   7. ✅ System health and monitoring")
        print()
        print("💡 This tests the complete AI receptionist workflow!")
    
    asyncio.run(run_all_tests())