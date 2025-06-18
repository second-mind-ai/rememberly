import { analyzeContent, fetchUrlContent, ContentAnalysis } from './openai';

// Updated AI service to use OpenAI
export async function summarizeContent(content: string, type: 'text' | 'url' | 'file' = 'text'): Promise<{
  title: string;
  summary: string;
  tags: string[];
  analysis?: ContentAnalysis;
}> {
  try {
    let processedContent = content;
    
    // If it's a URL, fetch the content first
    if (type === 'url') {
      try {
        processedContent = await fetchUrlContent(content);
      } catch (error) {
        console.error('URL fetch error:', error);
        throw new Error('Could not fetch content from the provided URL');
      }
    }

    // Analyze content with OpenAI
    const analysis = await analyzeContent(processedContent, type === 'url' ? content : undefined);
    
    return {
      title: analysis.title,
      summary: analysis.summary,
      tags: analysis.tags,
      analysis
    };
  } catch (error) {
    console.error('AI summarization error:', error);
    
    // Fallback to simple processing if OpenAI fails
    const lines = content.split('\n').filter(line => line.trim());
    const title = lines[0]?.substring(0, 50) + (lines[0]?.length > 50 ? '...' : '') || 'Untitled Note';
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const summary = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '.' : '');
    
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const commonWords = ['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 'were', 'said'];
    const tags = [...new Set(words)]
      .filter(word => !commonWords.includes(word))
      .slice(0, 5);
    
    return {
      title,
      summary: summary || content.substring(0, 100) + '...',
      tags: tags.length > 0 ? tags : ['note']
    };
  }
}

export { fetchUrlContent };