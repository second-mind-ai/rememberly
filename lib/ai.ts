// AI service for summarization and processing
export async function summarizeContent(content: string, type: 'text' | 'url' | 'file' | 'image' = 'text'): Promise<{
  title: string;
  summary: string;
  tags: string[];
}> {
  try {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (type === 'url') {
      return await analyzeUrlContent(content);
    }
    
    return await analyzeTextContent(content, type);
  } catch (error) {
    console.error('AI summarization error:', error);
    return {
      title: 'Error Processing Content',
      summary: 'Could not process this content automatically.',
      tags: ['error']
    };
  }
}

async function analyzeTextContent(content: string, type: 'text' | 'file' | 'image'): Promise<{
  title: string;
  summary: string;
  tags: string[];
}> {
  // Clean and prepare content
  const cleanContent = content.trim().replace(/\s+/g, ' ');
  
  // Generate title
  const title = generateTitle(cleanContent, type);
  
  // Generate summary
  const summary = generateSummary(cleanContent);
  
  // Extract tags
  const tags = extractTags(cleanContent, type);
  
  return { title, summary, tags };
}

async function analyzeUrlContent(url: string): Promise<{
  title: string;
  summary: string;
  tags: string[];
}> {
  // Extract domain for context
  const domain = extractDomain(url);
  
  // Simulate fetching and analyzing URL content
  // In a real implementation, you'd use a web scraping service
  const mockContent = await fetchUrlContent(url);
  
  const title = `Article from ${domain}`;
  const summary = generateSummary(mockContent);
  const tags = [...extractTags(mockContent, 'url'), 'web', 'article', domain.toLowerCase()];
  
  return { title, summary, tags };
}

function generateTitle(content: string, type: 'text' | 'file' | 'image'): string {
  // Extract first meaningful sentence or phrase
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) {
    return getDefaultTitle(type);
  }
  
  let title = sentences[0].trim();
  
  // Remove common prefixes
  title = title.replace(/^(the|a|an)\s+/i, '');
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Truncate to reasonable length (max 10 words)
  const words = title.split(' ');
  if (words.length > 10) {
    title = words.slice(0, 10).join(' ') + '...';
  }
  
  // Ensure minimum length
  if (title.length < 5) {
    return getDefaultTitle(type);
  }
  
  return title;
}

function generateSummary(content: string): string {
  // Split into sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  if (sentences.length === 0) {
    return 'No content available for summary.';
  }
  
  // Take first 2-3 most meaningful sentences
  const meaningfulSentences = sentences
    .slice(0, 5) // Consider first 5 sentences
    .filter(sentence => {
      const words = sentence.trim().split(' ');
      return words.length >= 5 && words.length <= 50; // Filter by length
    })
    .slice(0, 3); // Take top 3
  
  if (meaningfulSentences.length === 0) {
    // Fallback to first part of content
    return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
  }
  
  let summary = meaningfulSentences.join('. ').trim();
  
  // Ensure proper ending
  if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
    summary += '.';
  }
  
  // Limit length (2-3 lines, roughly 200 characters)
  if (summary.length > 200) {
    summary = summary.substring(0, 197) + '...';
  }
  
  return summary;
}

function extractTags(content: string, type: 'text' | 'url' | 'file' | 'image'): string[] {
  const text = content.toLowerCase();
  
  // Define keyword categories
  const categories = {
    technology: ['ai', 'artificial intelligence', 'machine learning', 'software', 'programming', 'code', 'tech', 'computer', 'digital', 'app', 'website', 'internet', 'data', 'algorithm', 'development'],
    business: ['business', 'startup', 'company', 'market', 'sales', 'revenue', 'profit', 'investment', 'finance', 'money', 'economy', 'strategy', 'management', 'entrepreneur'],
    health: ['health', 'medical', 'doctor', 'hospital', 'medicine', 'fitness', 'exercise', 'wellness', 'nutrition', 'diet', 'mental health', 'therapy', 'treatment'],
    education: ['education', 'learning', 'school', 'university', 'course', 'study', 'research', 'academic', 'knowledge', 'teaching', 'student', 'training'],
    science: ['science', 'research', 'study', 'experiment', 'discovery', 'innovation', 'scientific', 'analysis', 'theory', 'hypothesis'],
    lifestyle: ['lifestyle', 'travel', 'food', 'cooking', 'recipe', 'fashion', 'style', 'home', 'family', 'relationship', 'hobby', 'entertainment'],
    news: ['news', 'breaking', 'update', 'announcement', 'report', 'current', 'events', 'politics', 'government', 'world'],
    work: ['work', 'job', 'career', 'professional', 'office', 'meeting', 'project', 'task', 'deadline', 'productivity', 'remote work']
  };
  
  const foundTags = new Set<string>();
  
  // Add type-based tag
  foundTags.add(type);
  
  // Check for category keywords
  Object.entries(categories).forEach(([category, keywords]) => {
    const matches = keywords.filter(keyword => text.includes(keyword));
    if (matches.length > 0) {
      foundTags.add(category);
      // Add the most specific matching keyword
      const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
      foundTags.add(longestMatch);
    }
  });
  
  // Extract important words (4+ characters, not common words)
  const commonWords = new Set([
    'this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 
    'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 
    'other', 'after', 'first', 'well', 'also', 'where', 'much', 'should', 'very',
    'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such',
    'take', 'than', 'them', 'well', 'were', 'what', 'your', 'about', 'before',
    'being', 'between', 'both', 'during', 'into', 'through', 'under', 'while'
  ]);
  
  const words = text.match(/\b\w{4,}\b/g) || [];
  const importantWords = words
    .filter(word => !commonWords.has(word))
    .filter(word => /^[a-z]+$/.test(word)) // Only alphabetic words
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  // Add most frequent important words
  const sortedWords = Object.entries(importantWords)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([word]) => word);
  
  sortedWords.forEach(word => foundTags.add(word));
  
  // Convert to array and limit
  const tags = Array.from(foundTags).slice(0, 8);
  
  // Ensure we have at least some basic tags
  if (tags.length === 1) {
    tags.push('note', 'content');
  }
  
  return tags;
}

function getDefaultTitle(type: 'text' | 'file' | 'image'): string {
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  switch (type) {
    case 'file':
      return `Document - ${timestamp}`;
    case 'image':
      return `Image Note - ${timestamp}`;
    default:
      return `Note - ${timestamp}`;
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'website';
  }
}

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    // In a real implementation, you would use a web scraping service
    // For now, we'll simulate content based on the URL
    const domain = extractDomain(url);
    
    // Simulate different types of content based on domain
    if (domain.includes('github')) {
      return `GitHub Repository: ${url}\n\nThis appears to be a software development project hosted on GitHub. The repository likely contains source code, documentation, and project files for a software application or library.`;
    } else if (domain.includes('youtube') || domain.includes('youtu.be')) {
      return `YouTube Video: ${url}\n\nThis is a video content from YouTube. The video may contain educational content, entertainment, tutorials, or other multimedia information.`;
    } else if (domain.includes('medium') || domain.includes('blog')) {
      return `Blog Article: ${url}\n\nThis appears to be a blog post or article containing written content, insights, opinions, or informational material on various topics.`;
    } else if (domain.includes('news') || domain.includes('cnn') || domain.includes('bbc')) {
      return `News Article: ${url}\n\nThis is a news article containing current events, breaking news, or journalistic content covering recent developments and stories.`;
    } else {
      return `Web Content: ${url}\n\nThis webpage contains information and content from ${domain}. The page may include articles, product information, services, or other web-based content.`;
    }
  } catch (error) {
    console.error('URL fetch error:', error);
    throw new Error('Could not fetch URL content');
  }
}

// Enhanced content analysis for specific content types
export async function analyzeSpecificContent(content: string, contentType: string): Promise<{
  title: string;
  summary: string;
  tags: string[];
  metadata?: Record<string, any>;
}> {
  const baseAnalysis = await analyzeTextContent(content, 'text');
  
  // Add content-type specific analysis
  const metadata: Record<string, any> = {
    contentType,
    wordCount: content.split(/\s+/).length,
    readingTime: Math.ceil(content.split(/\s+/).length / 200), // Assuming 200 words per minute
    language: detectLanguage(content),
    sentiment: analyzeSentiment(content)
  };
  
  return {
    ...baseAnalysis,
    metadata
  };
}

function detectLanguage(content: string): string {
  // Simple language detection based on common words
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = content.toLowerCase().split(/\s+/);
  const englishMatches = words.filter(word => englishWords.includes(word)).length;
  
  return englishMatches > words.length * 0.1 ? 'en' : 'unknown';
}

function analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'excited'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed'];
  
  const words = content.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}