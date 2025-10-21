# AI Voice Receptionist - API Documentation

This document provides comprehensive documentation for all API endpoints and webhook specifications.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

Most endpoints require authentication in production. The system supports:

- **Development**: No authentication required
- **Production**: JWT-based authentication

### Authentication Headers

```http
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Health Check

#### GET /api/\_health

Returns system health status and metrics.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "database": {
    "connected": true,
    "responseTime": "15ms"
  },
  "backgroundJobs": {
    "running": true,
    "jobs": {
      "timeoutHandler": true,
      "healthMonitor": true
    }
  },
  "webhook": {
    "configured": true,
    "url": "http://localhost:8080/webhook"
  },
  "statistics": {
    "totalRequests": 150,
    "pendingRequests": 5,
    "totalKnowledgeEntries": 25
  },
  "environment": {
    "nodeEnv": "development",
    "aiProvider": "openai",
    "confidenceThreshold": 0.7,
    "requestTimeoutMinutes": 5
  }
}
```

**Status Codes:**

- `200 OK`: System is healthy
- `503 Service Unavailable`: System is unhealthy

---

### Help Requests

#### GET /api/help-requests

Retrieve help requests with filtering and pagination.

**Query Parameters:**

- `status` (optional): Filter by status (`PENDING`, `RESOLVED`, `UNRESOLVED`)
- `search` (optional): Search in question text and caller information
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (`createdAt`, `updatedAt`, `status`)
- `sortOrder` (optional): Sort order (`asc`, `desc`, default: `desc`)

**Example Request:**

```http
GET /api/help-requests?status=PENDING&page=1&limit=10&search=password
```

**Response:**

```json
{
  "data": [
    {
      "id": "req_123456789",
      "callerId": "caller_abc123",
      "callerPhone": "+1234567890",
      "question": "How do I reset my password?",
      "status": "PENDING",
      "answer": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "timeoutAt": "2024-01-15T10:35:00.000Z",
      "resolvedBy": null,
      "metadata": {
        "source": "voice_call",
        "confidence": 0.3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### POST /api/help-requests

Create a new help request (typically called by the voice agent).

**Request Body:**

```json
{
  "callerId": "caller_abc123",
  "callerPhone": "+1234567890",
  "question": "How do I reset my password?",
  "metadata": {
    "source": "voice_call",
    "confidence": 0.3,
    "sessionId": "session_xyz789"
  }
}
```

**Response:**

```json
{
  "id": "req_123456789",
  "callerId": "caller_abc123",
  "callerPhone": "+1234567890",
  "question": "How do I reset my password?",
  "status": "PENDING",
  "answer": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "timeoutAt": "2024-01-15T10:35:00.000Z",
  "resolvedBy": null,
  "metadata": {
    "source": "voice_call",
    "confidence": 0.3,
    "sessionId": "session_xyz789"
  }
}
```

**Status Codes:**

- `201 Created`: Request created successfully
- `400 Bad Request`: Invalid request data
- `500 Internal Server Error`: Server error

#### POST /api/help-requests/[id]/resolve

Resolve a help request with an answer.

**Path Parameters:**

- `id`: Help request ID

**Request Body:**

```json
{
  "answer": "You can reset your password by clicking the 'Forgot Password' link on the login page.",
  "addToKnowledgeBase": true,
  "resolvedBy": "supervisor_john"
}
```

**Response:**

```json
{
  "id": "req_123456789",
  "status": "RESOLVED",
  "answer": "You can reset your password by clicking the 'Forgot Password' link on the login page.",
  "resolvedBy": "supervisor_john",
  "updatedAt": "2024-01-15T10:35:00.000Z",
  "knowledgeBaseEntry": {
    "id": "kb_987654321",
    "question": "How do I reset my password?",
    "answer": "You can reset your password by clicking the 'Forgot Password' link on the login page."
  }
}
```

#### POST /api/help-requests/[id]/mark-unresolved

Mark a help request as unresolved (typically due to timeout).

**Path Parameters:**

- `id`: Help request ID

**Request Body:**

```json
{
  "reason": "timeout",
  "metadata": {
    "timeoutAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Response:**

```json
{
  "id": "req_123456789",
  "status": "UNRESOLVED",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

---

### Knowledge Base

#### GET /api/knowledge

Retrieve knowledge base entries with search functionality.

**Query Parameters:**

- `search` (optional): Search in questions and answers
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `source` (optional): Filter by source (`manual`, `supervisor`, `import`)

**Example Request:**

```http
GET /api/knowledge?search=password&page=1&limit=10
```

**Response:**

```json
{
  "data": [
    {
      "id": "kb_123456789",
      "question": "How do I reset my password?",
      "answer": "You can reset your password by clicking the 'Forgot Password' link on the login page.",
      "source": "supervisor",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### POST /api/knowledge

Create a new knowledge base entry.

**Request Body:**

```json
{
  "question": "What are your business hours?",
  "answer": "We are open Monday to Friday, 9 AM to 5 PM EST.",
  "source": "manual"
}
```

**Response:**

```json
{
  "id": "kb_123456789",
  "question": "What are your business hours?",
  "answer": "We are open Monday to Friday, 9 AM to 5 PM EST.",
  "source": "manual",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### PUT /api/knowledge/[id]

Update an existing knowledge base entry.

**Path Parameters:**

- `id`: Knowledge base entry ID

**Request Body:**

```json
{
  "question": "What are your business hours?",
  "answer": "We are open Monday to Friday, 8 AM to 6 PM EST.",
  "source": "manual"
}
```

**Response:**

```json
{
  "id": "kb_123456789",
  "question": "What are your business hours?",
  "answer": "We are open Monday to Friday, 8 AM to 6 PM EST.",
  "source": "manual",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

#### DELETE /api/knowledge/[id]

Delete a knowledge base entry.

**Path Parameters:**

- `id`: Knowledge base entry ID

**Response:**

```json
{
  "message": "Knowledge base entry deleted successfully",
  "id": "kb_123456789"
}
```

---

### Voice Agent

#### POST /api/voice-agent/process

Process a voice message through the AI agent with fuzzy matching and LLM processing.

**Request Body:**

```json
{
  "message": "What are your business hours?",
  "callerId": "caller_abc123"
}
```

**Response:**

```json
{
  "response": "Luxe Beauty Salon is open Tuesday through Saturday from 9 AM to 7 PM, and Sunday from 10 AM to 5 PM. We are closed on Mondays for staff training and maintenance.",
  "shouldEscalate": false,
  "confidence": 0.9,
  "escalated": false,
  "needsClarification": false
}
```

#### POST /api/voice-agent/tts

Generate text-to-speech audio for a given text.

**Request Body:**

```json
{
  "text": "Hello! How can I help you today?"
}
```

**Response:**

- **Success**: Returns audio/mpeg binary data
- **Quota Exceeded**: Returns 503 with fallback message

```json
{
  "error": "TTS quota exceeded",
  "message": "Audio synthesis temporarily unavailable",
  "fallback": true
}
```

#### POST /api/voice-agent/check-updates

Check for resolved help requests for a specific caller.

**Request Body:**

```json
{
  "helpRequestIds": ["req_123", "req_456"],
  "callerId": "caller_abc123"
}
```

**Response:**

```json
{
  "resolvedRequests": [
    {
      "id": "req_123",
      "question": "How do I reset my password?",
      "answer": "Click the Forgot Password link on the login page.",
      "resolvedBy": "supervisor_john",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "hasUpdates": true
}
```

---

## Webhook Specifications

The system uses webhooks to communicate between the Next.js application and the voice agent.

### Agent Webhook Endpoint

**URL**: `http://localhost:8080/webhook` (configurable via `AGENT_WEBHOOK_URL`)

#### POST /webhook

Notify the agent about help request resolution.

**Headers:**

```http
Content-Type: application/json
X-Webhook-Signature: sha256=<signature>
```

**Request Body:**

```json
{
  "type": "help_request_resolved",
  "requestId": "req_123456789",
  "callerId": "caller_abc123",
  "answer": "You can reset your password by clicking the 'Forgot Password' link on the login page.",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

**Response:**

```json
{
  "status": "received",
  "requestId": "req_123456789",
  "processedAt": "2024-01-15T10:35:01.000Z"
}
```

### Webhook Security

Webhooks are secured using HMAC-SHA256 signatures:

1. **Signature Generation**:

   ```javascript
   const signature = crypto
     .createHmac('sha256', process.env.WEBHOOK_SECRET)
     .update(JSON.stringify(payload))
     .digest('hex')
   ```

2. **Signature Verification**:
   ```javascript
   const expectedSignature = `sha256=${signature}`
   const receivedSignature = request.headers['x-webhook-signature']
   const isValid = crypto.timingSafeEqual(
     Buffer.from(expectedSignature),
     Buffer.from(receivedSignature)
   )
   ```

---

## Error Handling

### Standard Error Response

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "question",
      "issue": "Question is required"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes

| Code                  | HTTP Status | Description                     |
| --------------------- | ----------- | ------------------------------- |
| `VALIDATION_ERROR`    | 400         | Request validation failed       |
| `NOT_FOUND`           | 404         | Resource not found              |
| `UNAUTHORIZED`        | 401         | Authentication required         |
| `FORBIDDEN`           | 403         | Insufficient permissions        |
| `RATE_LIMITED`        | 429         | Too many requests               |
| `INTERNAL_ERROR`      | 500         | Server error                    |
| `SERVICE_UNAVAILABLE` | 503         | Service temporarily unavailable |

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Health endpoint**: 300 requests per minute per IP
- **Webhook endpoints**: 1000 requests per minute per IP

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

---

## SDK and Client Libraries

### JavaScript/TypeScript Client

```typescript
import { AIReceptionistClient } from '@ai-receptionist/client'

const client = new AIReceptionistClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key', // For production
})

// Create help request
const request = await client.helpRequests.create({
  callerId: 'caller_123',
  question: 'How do I reset my password?',
})

// Get knowledge base entries
const knowledge = await client.knowledge.list({
  search: 'password',
  limit: 10,
})
```

### cURL Examples

```bash
# Health check
curl -X GET http://localhost:3000/api/health

# Create help request
curl -X POST http://localhost:3000/api/help-requests \
  -H "Content-Type: application/json" \
  -d '{
    "callerId": "caller_123",
    "question": "How do I reset my password?"
  }'

# Search knowledge base
curl -X GET "http://localhost:3000/api/knowledge?search=password&limit=5"

# Resolve help request
curl -X POST http://localhost:3000/api/help-requests/req_123/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "Click the Forgot Password link",
    "addToKnowledgeBase": true
  }'
```

---

## Testing

### API Testing

Use the provided test suite to validate API functionality:

```bash
# Run API tests
npm run test:api

# Test specific endpoints
npm run test:api -- --grep "help-requests"

# Load testing
npm run test:performance
```

### Postman Collection

Import the Postman collection from `docs/postman/ai-receptionist-api.json` for interactive API testing.

---

## Changelog

### Version 1.0.0

- Initial API release
- Help requests CRUD operations
- Knowledge base management
- Webhook system for agent communication
- Health monitoring endpoints

For the latest API changes, see the [CHANGELOG.md](../CHANGELOG.md) file.
