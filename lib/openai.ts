import OpenAI from 'openai';
import Constants from 'expo-constants';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

export interface ContentAnalysis {
  title: string;
  description: string;
  summary: string;
  tags: string[];
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPoints: string[];
}

export async function analyzeContent(content: string, sourceUrl?: string): Promise<ContentAnalysis> {
  try {
    const prompt = `
Analyze the following content and provide a structured response in JSON format:

Content: ${content}
${sourceUrl ? `Source URL: ${sourceUrl}` : ''}

Please provide:
1. A clear, concise title (max 60 characters)
2. A brief description (max 150 characters) 
3. A comprehensive summary (2-3 sentences)
4. Relevant tags (5-8 keywords)
5. A category (e.g., Technology, Health, Business, Education, etc.)
6. Sentiment analysis (positive, neutral, or negative)
7. Key points (3-5 bullet points of main takeaways)

Return only valid JSON in this exact format:
{
  "title": "...",
  "description": "...", 
  "summary": "...",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "...",
  "sentiment": "positive|neutral|negative",
  "keyPoints": ["point1", "point2", "point3"]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert content analyzer. Always respond with valid JSON only, no additional text or formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const analysis = JSON.parse(response) as ContentAnalysis;
    
    // Validate required fields
    if (!analysis.title || !analysis.summary || !analysis.tags) {
      throw new Error('Invalid response format from OpenAI');
    }

    return analysis;
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    
    // Fallback analysis if OpenAI fails
    return {
      title: extractTitle(content),
      description: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
      summary: extractSummary(content),
      tags: extractTags(content),
      category: 'General',
      sentiment: 'neutral',
      keyPoints: extractKeyPoints(content)
    };
  }
}

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    // For web scraping, we'll use a CORS proxy or server-side endpoint
    // In production, you'd want to implement this server-side for better reliability
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('Failed to fetch URL content');
    }

    // Basic HTML content extraction (you might want to use a proper HTML parser)
    const htmlContent = data.contents;
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return textContent;
  } catch (error) {
    console.error('URL fetch error:', error);
    throw new Error('Could not fetch content from the provided URL. Please check the URL and try again.');
  }
}

// Fallback functions for when OpenAI is unavailable
function extractTitle(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  const firstLine = lines[0]?.trim() || 'Untitled Content';
  return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
}

function extractSummary(content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  const summary = sentences.slice(0, 2).join('. ').trim();
  return summary + (sentences.length > 2 ? '.' : '');
}

function extractTags(content: string): string[] {
  const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const commonWords = ['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 'were', 'said', 'what', 'your', 'when', 'here', 'how', 'all', 'any', 'may', 'say'];
  
  const uniqueWords = [...new Set(words)]
    .filter(word => !commonWords.includes(word))
    .slice(0, 6);
    
  return uniqueWords.length > 0 ? uniqueWords : ['content', 'note'];
}

function extractKeyPoints(content: string): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim() && s.length > 20);
  return sentences.slice(0, 3).map(s => s.trim());
}