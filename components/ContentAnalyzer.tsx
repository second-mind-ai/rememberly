import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { summarizeContent, analyzeSpecificContent } from '@/lib/ai';
import { Brain, FileText, Link2, Image as ImageIcon, Tag, Clock, Globe } from 'lucide-react-native';

interface AnalysisResult {
  title: string;
  summary: string;
  tags: string[];
  metadata?: Record<string, any>;
}

interface ContentAnalyzerProps {
  onAnalysisComplete?: (result: AnalysisResult) => void;
  placeholder?: string;
  contentType?: 'text' | 'url' | 'file' | 'image';
}

export function ContentAnalyzer({ 
  onAnalysisComplete, 
  placeholder = "Paste your content here to analyze...",
  contentType = 'text'
}: ContentAnalyzerProps) {
  const [content, setContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!content.trim()) {
      setError('Please enter some content to analyze');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      let analysisResult: AnalysisResult;

      if (contentType === 'text') {
        analysisResult = await analyzeSpecificContent(content, 'text');
      } else {
        const basicResult = await summarizeContent(content, contentType);
        analysisResult = {
          ...basicResult,
          metadata: {
            contentType,
            wordCount: content.split(/\s+/).length,
            readingTime: Math.ceil(content.split(/\s+/).length / 200)
          }
        };
      }

      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
    } catch (err) {
      setError('Failed to analyze content. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleClear() {
    setContent('');
    setResult(null);
    setError(null);
  }

  const getContentIcon = () => {
    switch (contentType) {
      case 'url':
        return <Link2 size={20} color="#2563EB" strokeWidth={2} />;
      case 'file':
      case 'image':
        return <ImageIcon size={20} color="#D97706" strokeWidth={2} />;
      default:
        return <FileText size={20} color="#059669" strokeWidth={2} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {getContentIcon()}
          <Text style={styles.headerTitle}>Content Analyzer</Text>
        </View>
        <Brain size={24} color="#7C3AED" strokeWidth={2} />
      </View>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.textInput}
          value={content}
          onChangeText={setContent}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          editable={!analyzing}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.analyzeButton, (!content.trim() || analyzing) && styles.buttonDisabled]}
            onPress={handleAnalyze}
            disabled={!content.trim() || analyzing}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Brain size={16} color="#ffffff" strokeWidth={2} />
                <Text style={styles.buttonText}>Analyze</Text>
              </>
            )}
          </TouchableOpacity>

          {(content || result) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              disabled={analyzing}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {analyzing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>AI is analyzing your content...</Text>
          <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        </View>
      )}

      {result && !analyzing && (
        <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.resultSection}>
            <Text style={styles.resultSectionTitle}>Generated Title</Text>
            <View style={styles.titleContainer}>
              <Text style={styles.resultTitle}>{result.title}</Text>
            </View>
          </View>

          <View style={styles.resultSection}>
            <Text style={styles.resultSectionTitle}>Summary</Text>
            <View style={styles.summaryContainer}>
              <Text style={styles.resultSummary}>{result.summary}</Text>
            </View>
          </View>

          {result.tags && result.tags.length > 0 && (
            <View style={styles.resultSection}>
              <View style={styles.tagsHeader}>
                <Tag size={16} color="#6B7280" strokeWidth={2} />
                <Text style={styles.resultSectionTitle}>Tags</Text>
              </View>
              <View style={styles.tagsContainer}>
                {result.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {result.metadata && (
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionTitle}>Analysis Details</Text>
              <View style={styles.metadataContainer}>
                {result.metadata.wordCount && (
                  <View style={styles.metadataItem}>
                    <FileText size={14} color="#6B7280" strokeWidth={2} />
                    <Text style={styles.metadataText}>
                      {result.metadata.wordCount} words
                    </Text>
                  </View>
                )}
                {result.metadata.readingTime && (
                  <View style={styles.metadataItem}>
                    <Clock size={14} color="#6B7280" strokeWidth={2} />
                    <Text style={styles.metadataText}>
                      {result.metadata.readingTime} min read
                    </Text>
                  </View>
                )}
                {result.metadata.language && (
                  <View style={styles.metadataItem}>
                    <Globe size={14} color="#6B7280" strokeWidth={2} />
                    <Text style={styles.metadataText}>
                      {result.metadata.language.toUpperCase()}
                    </Text>
                  </View>
                )}
                {result.metadata.sentiment && (
                  <View style={styles.metadataItem}>
                    <View style={[
                      styles.sentimentIndicator,
                      { backgroundColor: getSentimentColor(result.metadata.sentiment) }
                    ]} />
                    <Text style={styles.metadataText}>
                      {result.metadata.sentiment} sentiment
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive':
      return '#10B981';
    case 'negative':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  inputSection: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#7C3AED',
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  resultContainer: {
    maxHeight: 400,
  },
  resultSection: {
    marginBottom: 20,
  },
  resultSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  titleContainer: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    lineHeight: 24,
  },
  summaryContainer: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  resultSummary: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
  },
  tagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#7C3AED',
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  sentimentIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});