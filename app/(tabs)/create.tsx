import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useNotesStore } from '@/lib/store';
import { summarizeContent, fetchUrlContent } from '@/lib/ai';
import { FileText, Link2, Image as ImageIcon, Camera, Upload, Sparkles, Brain } from 'lucide-react-native';

type NoteType = 'text' | 'url' | 'file' | 'image';

export default function CreateScreen() {
  const [activeTab, setActiveTab] = useState<NoteType>('text');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisPreview, setAnalysisPreview] = useState<any>(null);
  const { createNote } = useNotesStore();

  async function handleAnalyzeContent() {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content to analyze');
      return;
    }

    setLoading(true);
    try {
      const result = await summarizeContent(content, activeTab);
      setAnalysisPreview(result);
    } catch (error) {
      Alert.alert('Analysis Error', error instanceof Error ? error.message : 'Failed to analyze content');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNote() {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    setLoading(true);
    try {
      let finalContent = content;
      let aiResult;

      // If it's a URL, fetch the content
      if (activeTab === 'url') {
        try {
          finalContent = await fetchUrlContent(content);
        } catch (error) {
          Alert.alert('Error', 'Could not fetch URL content');
          setLoading(false);
          return;
        }
      }

      // Get AI analysis
      aiResult = await summarizeContent(finalContent, activeTab);

      // Create note
      const noteData = {
        title: aiResult.title,
        original_content: finalContent,
        summary: aiResult.summary,
        type: activeTab,
        tags: aiResult.tags,
        source_url: activeTab === 'url' ? content : null,
        file_url: activeTab === 'file' || activeTab === 'image' ? content : null,
      };

      const newNote = await createNote(noteData);
      
      if (newNote) {
        Alert.alert('Success', 'Note created successfully!', [
          { text: 'OK', onPress: () => {
            setContent('');
            setAnalysisPreview(null);
            router.push('/(tabs)');
          }}
        ]);
      } else {
        Alert.alert('Error', 'Failed to create note');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Create note error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImagePicker() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setContent(result.assets[0].uri);
      setActiveTab('image');
    }
  }

  async function handleCameraPicker() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setContent(result.assets[0].uri);
      setActiveTab('image');
    }
  }

  async function handleDocumentPicker() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setContent(result.assets[0].uri);
        setActiveTab('file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  }

  const tabs = [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'url', label: 'URL', icon: Link2 },
    { id: 'file', label: 'File', icon: Upload },
    { id: 'image', label: 'Image', icon: ImageIcon },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Create Note</Text>
          <View style={styles.aiIndicator}>
            <Brain size={16} color="#7C3AED" strokeWidth={2} />
            <Text style={styles.aiText}>AI Powered</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Capture and let AI organize your thoughts</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.id as NoteType)}
              >
                <Icon 
                  size={20} 
                  color={isActive ? '#2563EB' : '#6B7280'} 
                  strokeWidth={2}
                />
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.inputSection}>
          {activeTab === 'text' && (
            <View>
              <Text style={styles.inputLabel}>Enter your text</Text>
              <TextInput
                style={styles.textInput}
                value={content}
                onChangeText={setContent}
                placeholder="Type or paste your content here..."
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {activeTab === 'url' && (
            <View>
              <Text style={styles.inputLabel}>Enter URL</Text>
              <TextInput
                style={styles.urlInput}
                value={content}
                onChangeText={setContent}
                placeholder="https://example.com/article"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helpText}>
                Paste any web article, blog post, or webpage URL for AI analysis
              </Text>
            </View>
          )}

          {activeTab === 'file' && (
            <View style={styles.fileSection}>
              <Text style={styles.inputLabel}>Upload Document</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={handleDocumentPicker}>
                <Upload size={24} color="#2563EB" strokeWidth={2} />
                <Text style={styles.uploadText}>Choose File</Text>
              </TouchableOpacity>
              {content && (
                <Text style={styles.selectedFile}>Selected: {content.split('/').pop() || 'No file selected'}</Text>
              )}
            </View>
          )}

          {activeTab === 'image' && (
            <View style={styles.imageSection}>
              <Text style={styles.inputLabel}>Add Image</Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={handleCameraPicker}>
                  <Camera size={24} color="#2563EB" strokeWidth={2} />
                  <Text style={styles.imageButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={handleImagePicker}>
                  <ImageIcon size={24} color="#2563EB" strokeWidth={2} />
                  <Text style={styles.imageButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
              {content && (
                <Text style={styles.selectedFile}>Selected: {content.split('/').pop() || 'No file selected'}</Text>
              )}
            </View>
          )}
        </View>

        {/* AI Analysis Preview Button */}
        {content.trim() && !analysisPreview && (
          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.buttonDisabled]}
            onPress={handleAnalyzeContent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <>
                <Sparkles size={16} color="#7C3AED" strokeWidth={2} />
                <Text style={styles.analyzeButtonText}>Preview AI Analysis</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* AI Analysis Preview */}
        {analysisPreview && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Sparkles size={16} color="#7C3AED" strokeWidth={2} />
              <Text style={styles.previewTitle}>AI Analysis Preview</Text>
            </View>
            
            <View style={styles.previewCard}>
              <Text style={styles.previewItemTitle}>Title</Text>
              <Text style={styles.previewItemContent}>{analysisPreview.title}</Text>
              
              <Text style={styles.previewItemTitle}>Summary</Text>
              <Text style={styles.previewItemContent}>{analysisPreview.summary}</Text>
              
              <Text style={styles.previewItemTitle}>Tags</Text>
              <View style={styles.previewTags}>
                {analysisPreview.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.previewTag}>
                    <Text style={styles.previewTagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {analysisPreview.analysis && (
                <>
                  <Text style={styles.previewItemTitle}>Category</Text>
                  <Text style={styles.previewItemContent}>{analysisPreview.analysis.category}</Text>
                  
                  <Text style={styles.previewItemTitle}>Sentiment</Text>
                  <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor(analysisPreview.analysis.sentiment) }]}>
                    <Text style={styles.sentimentText}>{analysisPreview.analysis.sentiment.toUpperCase()}</Text>
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.editPreviewButton}
              onPress={() => setAnalysisPreview(null)}
            >
              <Text style={styles.editPreviewText}>Edit Content</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, (!content.trim() || loading) && styles.createButtonDisabled]}
          onPress={handleCreateNote}
          disabled={!content.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Brain size={16} color="#ffffff" strokeWidth={2} />
              <Text style={styles.createButtonText}>Create Note with AI</Text>
            </>
          )}
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingSection}>
            <Text style={styles.loadingText}>
              {analysisPreview ? 'Creating your note...' : 'AI is analyzing your content...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return '#10B981';
    case 'negative': return '#EF4444';
    default: return '#6B7280';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#7C3AED',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  urlInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  fileSection: {
    gap: 16,
  },
  uploadButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  imageSection: {
    gap: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  selectedFile: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 24,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#7C3AED',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  previewItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 4,
  },
  previewItemContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  sentimentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sentimentText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  editPreviewButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editPreviewText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#7C3AED',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});