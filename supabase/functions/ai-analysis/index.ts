import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AnalysisRequest {
  content: string
  type: 'text' | 'url' | 'file' | 'image'
  imageUrl?: string
}

interface AnalysisResponse {
  title: string
  summary: string
  tags: string[]
}

// Rate limiting storage (in-memory for this example)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_REQUESTS = 10 // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new rate limit window
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return false
  }

  userLimit.count++
  return true
}

async function analyzeWithGPT4(
  content: string,
  type: string,
  imageUrl?: string
): Promise<AnalysisResponse> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
  
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const messages = [
    {
      role: 'system',
      content: "You are an intelligent content analyzer designed to process notes in any domain, including images. Your core tasks are: Generate optimized, context-aware titles that are clear, engaging, and summarize the main idea. Write concise summaries that capture key points in a readable and informative way. Extract relevant, searchable tags that help organize and retrieve the note easily. For images, describe what you see and extract meaningful insights. You must analyze the input deeply, understand the full context, and always respond in the **same language as the user's input**, with special support for Arabic (ar) and other multilingual content. Your outputs must be: Title: 1 line, compelling and context-representative. Summary: 2–3 sentences capturing the core insight. Tags: 3–7 keywords, comma-separated, no hashtags.",
    }
  ]

  // Handle image content with vision capabilities
  if (type === 'image' && imageUrl) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this image and provide a JSON response with exactly this structure:

{
  "title": "A smart, engaging title describing the image (max 8 words)",
  "summary": "A clear, concise summary describing what's in the image and its significance (2-4 sentences)",
  "tags": ["array", "of", "relevant", "tags", "describing", "image", "content", "max", "10", "tags"]
}

Additional context: ${content}

Requirements:
- Title should describe what's in the image
- Summary should explain the image content and any visible text or important details
- Tags should include visual elements, objects, themes, and relevant keywords
- Focus on making this useful for someone organizing their visual notes
- Ensure the response is valid JSON only`
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'high'
          }
        }
      ]
    })
  } else {
    // Handle text content
    const contentPreview = content.length > 2000 ? content.substring(0, 2000) + '...' : content

    const prompt = `Analyze this ${type} content and provide a JSON response with exactly this structure:

{
  "title": "A smart, engaging title (max 8 words)",
  "summary": "A clear, concise summary (2-4 sentences) that captures the main points",
  "tags": ["array", "of", "relevant", "tags", "max", "10", "tags"]
}

Content to analyze:
${contentPreview}

Requirements:
- Title should be descriptive, engaging, and human-readable
- Summary should be conversational and highlight key insights
- Tags should include topics, categories, and relevant keywords
- Focus on making this useful for someone organizing their notes
- Ensure the response is valid JSON only`

    messages.push({
      role: 'user',
      content: prompt,
    })
  }

  // Use gpt-4o for images (vision capabilities), gpt-4o-mini for text/URLs (cost-effective)
  const model = (type === 'image' && imageUrl) ? 'gpt-4o' : 'gpt-4o-mini'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 500,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.warn('OpenAI API error response:', errorText)
    throw new Error(`OpenAI API rate limit exceeded. Please try again later.`)
  }

  const data = await response.json()
  const aiResponse = data.choices[0]?.message?.content

  if (!aiResponse) {
    throw new Error('No response from OpenAI')
  }

  return parseAIResponse(aiResponse)
}

function parseAIResponse(response: string): AnalysisResponse {
  try {
    // Clean the response to ensure it's valid JSON
    const cleanResponse = response.trim()
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and clean the response
    return {
      title: (parsed.title || 'Untitled Note').substring(0, 100),
      summary: (parsed.summary || 'No summary available').substring(0, 500),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : ['note'],
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    throw new Error('Invalid AI response format')
  }
}

async function performEnhancedLocalAnalysis(
  content: string,
  type: string,
  imageUrl?: string
): Promise<AnalysisResponse> {
  // Simulate processing time for better UX
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Handle image content specially
  if (type === 'image' && imageUrl) {
    const filename = imageUrl.split('/').pop()?.split('?')[0] || 'image'
    const cleanFilename = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    
    let title = 'Image Note'
    let summary = `An image file has been uploaded to this note. The image is stored securely and can be viewed in the note details.`
    
    if (content && content.trim() && !content.includes('Image file:')) {
      const words = content.trim().split(' ').slice(0, 6).join(' ')
      title = `Image: ${words}`
      summary = `This image was uploaded with the following context: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`
    }
    
    const tags = ['image', 'visual', 'media']
    const extension = filename.split('.').pop()?.toLowerCase()
    if (extension) tags.push(extension)
    
    return { title, summary, tags }
  }

  // Enhanced text analysis
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10)
  const words = content.toLowerCase().match(/\b\w+\b/g) || []

  // Generate intelligent title
  let title = 'Untitled Note'
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim()
    const titleWords = firstSentence.split(' ').slice(0, 8).join(' ')
    title = titleWords.charAt(0).toUpperCase() + titleWords.slice(1)
    if (!title.endsWith('?')) {
      title = title.replace(/[.!,;:]+$/, '')
    }
  }

  // Generate summary
  let summary = 'No content available for summary.'
  if (content.length > 0) {
    if (content.length <= 200) {
      summary = content
    } else {
      const topSentences = sentences.slice(0, 3).join(' ')
      summary = topSentences.length > 250 
        ? content.substring(0, 197) + '...'
        : topSentences
    }
  }

  // Generate tags
  const commonWords = new Set([
    'this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want',
    'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could'
  ])
  
  const importantWords = words
    .filter(word => word.length > 3 && !commonWords.has(word))
    .reduce((acc: Record<string, number>, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {})

  const tags = Object.entries(importantWords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word)

  // Add content type and basic tags
  tags.unshift(type)
  if (tags.length < 3) {
    tags.push('note', 'content')
  }

  return {
    title: title.length > 100 ? title.substring(0, 97) + '...' : title,
    summary: summary.length > 500 ? summary.substring(0, 497) + '...' : summary,
    tags: [...new Set(tags)].slice(0, 10)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    // Initialize Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Check rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response('Rate limit exceeded', { 
        status: 429, 
        headers: {
          ...corsHeaders,
          'Retry-After': '60'
        }
      })
    }

    // Parse request body
    const { content, type, imageUrl }: AnalysisRequest = await req.json()

    if (!content || !type) {
      return new Response('Missing required fields: content and type', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Validate content length
    if (content.length > 10000) {
      return new Response('Content too long (max 10,000 characters)', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log(`🔍 Analyzing ${type} content for user ${user.id}`)

    let result: AnalysisResponse

    try {
      // Try OpenAI analysis first
      result = await analyzeWithGPT4(content, type, imageUrl)
      console.log('✅ OpenAI analysis successful')
    } catch (error) {
      console.warn('OpenAI analysis failed, falling back to local analysis:', error)
      // Fallback to enhanced local analysis
      result = await performEnhancedLocalAnalysis(content, type, imageUrl)
      console.log('✅ Local analysis completed')
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ AI analysis function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      }
    )
  }
})