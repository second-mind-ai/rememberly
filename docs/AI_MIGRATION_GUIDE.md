# AI Analysis Migration Guide

This guide documents the migration from client-side OpenAI API calls to a secure Supabase Edge Function for AI analysis.

## 🔄 Migration Overview

The AI analysis functionality has been moved from the client-side (`lib/ai.ts`) to a secure Supabase Edge Function (`supabase/functions/ai-analysis/index.ts`) to:

1. **Secure API Keys**: OpenAI API key is now stored securely on the server
2. **Rate Limiting**: Implement proper rate limiting per user
3. **Cost Control**: Better monitoring and control of API usage
4. **Authentication**: Ensure only authenticated users can access AI features

## 🏗️ Architecture Changes

### Before (Client-Side)
```
Mobile App → OpenAI API (with exposed API key)
```

### After (Server-Side)
```
Mobile App → Supabase Edge Function → OpenAI API (with secure API key)
```

## 🔧 Setup Instructions

### 1. Deploy the Edge Function

Deploy the AI analysis Edge Function to your Supabase project:

```bash
# Navigate to your project root
cd your-project

# Deploy the function
supabase functions deploy ai-analysis
```

### 2. Set Environment Variables

In your Supabase dashboard, go to **Settings** → **Edge Functions** and add:

```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Update Client Configuration

The client code has been updated to use the Edge Function instead of direct OpenAI API calls. No additional configuration needed.

## 🔐 Security Features

### Authentication
- All requests require valid Supabase authentication
- User session tokens are validated on each request
- Unauthorized requests are rejected with 401 status

### Rate Limiting
- **10 requests per minute** per user
- Rate limit resets every 60 seconds
- Exceeded limits return 429 status with retry-after header

### Input Validation
- Content length limited to 10,000 characters
- Required fields validation (content, type)
- Malformed requests return 400 status

## 📊 API Reference

### Endpoint
```
POST /functions/v1/ai-analysis
```

### Headers
```
Authorization: Bearer <user_session_token>
Content-Type: application/json
```

### Request Body
```json
{
  "content": "Text content to analyze",
  "type": "text|url|file|image",
  "imageUrl": "https://example.com/image.jpg" // Optional, for image analysis
}
```

### Response Format

#### Success (200)
```json
{
  "success": true,
  "data": {
    "title": "Generated title",
    "summary": "Generated summary",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

#### Error (4xx/5xx)
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

## 🚨 Error Handling

### Client-Side Fallback
If the Edge Function fails, the client automatically falls back to enhanced local analysis:

1. **Edge Function Error**: Network issues, server errors
2. **Fallback Triggered**: Local analysis using existing algorithms
3. **User Experience**: Seamless experience with slightly reduced AI quality

### Common Error Scenarios

| Error | Status | Description | Client Action |
|-------|--------|-------------|---------------|
| Unauthorized | 401 | Invalid/expired session | Redirect to login |
| Rate Limited | 429 | Too many requests | Show retry message |
| Content Too Long | 400 | >10,000 characters | Truncate content |
| OpenAI API Error | 500 | AI service unavailable | Use local fallback |

## 📈 Monitoring

### Edge Function Logs
Monitor function execution in Supabase dashboard:
1. Go to **Edge Functions** → **ai-analysis**
2. Check **Logs** tab for execution details
3. Monitor error rates and performance

### Rate Limiting Metrics
Track rate limiting effectiveness:
- Monitor 429 responses
- Adjust limits based on usage patterns
- Consider implementing user-specific limits

## 🔄 Migration Checklist

- [x] Create Edge Function with security features
- [x] Update client code to use Edge Function
- [x] Implement authentication validation
- [x] Add rate limiting (10 req/min per user)
- [x] Add input validation and error handling
- [x] Maintain fallback to local analysis
- [x] Preserve existing API response format
- [x] Add comprehensive error handling
- [x] Document migration process

## 🧪 Testing

### Test Authentication
```bash
# Test without auth (should fail)
curl -X POST 'https://your-project.supabase.co/functions/v1/ai-analysis' \
  -H 'Content-Type: application/json' \
  -d '{"content": "test", "type": "text"}'

# Expected: 401 Unauthorized
```

### Test Rate Limiting
```bash
# Send 11 requests rapidly (should hit rate limit)
for i in {1..11}; do
  curl -X POST 'https://your-project.supabase.co/functions/v1/ai-analysis' \
    -H 'Authorization: Bearer your_token' \
    -H 'Content-Type: application/json' \
    -d '{"content": "test", "type": "text"}'
done

# Expected: First 10 succeed, 11th returns 429
```

### Test Content Analysis
```bash
# Test normal analysis
curl -X POST 'https://your-project.supabase.co/functions/v1/ai-analysis' \
  -H 'Authorization: Bearer your_token' \
  -H 'Content-Type: application/json' \
  -d '{"content": "This is a test note about artificial intelligence and machine learning.", "type": "text"}'

# Expected: 200 with analysis results
```

## 🔮 Future Enhancements

### Planned Improvements
1. **User-Specific Rate Limits**: Different limits for free vs premium users
2. **Usage Analytics**: Track API usage per user for billing
3. **Caching**: Cache analysis results for identical content
4. **Batch Processing**: Support multiple content analysis in single request
5. **Custom Models**: Support for different AI models based on content type

### Performance Optimizations
1. **Connection Pooling**: Reuse OpenAI API connections
2. **Response Compression**: Compress large responses
3. **Regional Deployment**: Deploy functions closer to users
4. **Streaming Responses**: Stream analysis results for large content

## 📞 Support

If you encounter issues during migration:

1. Check Edge Function logs in Supabase dashboard
2. Verify environment variables are set correctly
3. Test authentication with valid session tokens
4. Monitor rate limiting and adjust if needed
5. Ensure OpenAI API key has sufficient credits

The migration maintains full backward compatibility while adding security and performance improvements.