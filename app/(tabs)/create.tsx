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
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useNotesStore } from '@/lib/store';
import { summarizeContent, fetchUrlContent } from '@/lib/ai';
import { FileText, Link2, Image as ImageIcon, Camera, Upload, Brain, Sparkles, Check, X, Zap, Star, Paperclip, Search, Mic } from 'lucide-react-native';

type NoteType = 'text' | 'url' | 'file' | 'image';

interface AIPreview {
  title: string;
  summary: string;
  tags: string[];
}

export default function CreateScreen() {
  const [activeTab, setActiveTab] = useState<NoteType>('text');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiPreview, setAiPreview] = useState<AIPreview | null>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const { createNote } = useNotesStore();

  async function handleAnalyzeContent() {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      let finalContent = content;

      // If it's a URL, fetch the content first
      if (activeTab === 'url') {
        try {
          finalContent = await fetchUrlContent(content);
        } catch (error) {
          Alert.alert('Error', 'Could not fetch URL content. Please check the URL and try again.');
          setAnalyzing(false);
          return;
        }
      }

      // Get AI analysis with enhanced intelligence
      const aiResult = await summarizeContent(finalContent, activeTab);
      
      setAiPreview(aiResult);
      setCustomTitle(aiResult.title);
      setCustomSummary(aiResult.summary);
      setShowAiPreview(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze content. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCreateNote() {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    // If no AI preview exists, analyze first
    if (!aiPreview) {
      await handleAnalyzeContent();
      return;
    }

    setLoading(true);
    try {
      let finalContent = content;

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

      // Create note with AI-generated or custom data
      const noteData = {
        title: customTitle || aiPreview.title,
        original_content: finalContent,
        summary: customSummary || aiPreview.summary,
        type: activeTab,
        tags: aiPreview.tags,
        source_url: activeTab === 'url' ? content : null,
        file_url: activeTab === 'file' || activeTab === 'image' ? content : null,
      };

      const newNote = await createNote(noteData);
      
      if (newNote) {
        Alert.alert('Success', 'Note created successfully with AI-powered organization!', [
          { text: 'OK', onPress: () => router.push('/(tabs)') }
        ]);
        handleClearAll();
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

  function handleClearAll() {
    setContent('');
    setAiPreview(null);
    setShowAiPreview(false);
    setCustomTitle('');
    setCustomSummary('');
  }

  function handleDiscardPreview() {
    setAiPreview(null);
    setShowAiPreview(false);
    setCustomTitle('');
    setCustomSummary('');
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

  const canAnalyze = content.trim() && !analyzing && !loading;
  const canCreate = content.trim() && aiPreview && !analyzing && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Create Note</Text>
          <View style={styles.aiIndicator}>
            <Brain size={16} color="#7C3AED" strokeWidth={2} />
            <Text style={styles.aiIndicatorText}>AI-Powered</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>AI will automatically analyze and organize your content</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ChatGPT-style Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.chatInputContainer}>
            <TextInput
              style={[
                styles.chatInput,
                I18nManager.isRTL && styles.rtlText
              ]}
              value={content}
              onChangeText={setContent}
              placeholder="Write a note, save link"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            
            <View style={styles.inputActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleDocumentPicker}
                activeOpacity={0.7}
              >
                <Paperclip size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {/* Search functionality */}}
                activeOpacity={0.7}
              >
                <Search size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {/* Voice functionality */}}
                activeOpacity={0.7}
              >
                <Mic size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, activeTab === 'text' && styles.quickActionActive]}
              onPress={() => setActiveTab('text')}
            >
              <FileText size={18} color={activeTab === 'text' ? "#ffffff" : "#6B7280"} strokeWidth={2} />
              <Text style={[styles.quickActionText, activeTab === 'text' && styles.quickActionTextActive]}>
                Text
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, activeTab === 'url' && styles.quickActionActive]}
              onPress={() => setActiveTab('url')}
            >
              <Link2 size={18} color={activeTab === 'url' ? "#ffffff" : "#6B7280"} strokeWidth={2} />
              <Text style={[styles.quickActionText, activeTab === 'url' && styles.quickActionTextActive]}>
                URL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, activeTab === 'file' && styles.quickActionActive]}
              onPress={() => {
                setActiveTab('file');
                handleDocumentPicker();
              }}
            >
              <Upload size={18} color={activeTab === 'file' ? "#ffffff" : "#6B7280"} strokeWidth={2} />
              <Text style={[styles.quickActionText, activeTab === 'file' && styles.quickActionTextActive]}>
                File
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, activeTab === 'image' && styles.quickActionActive]}
              onPress={() => {
                setActiveTab('image');
                handleImagePicker();
              }}
            >
              <ImageIcon size={18} color={activeTab === 'image' ? "#ffffff" : "#6B7280"} strokeWidth={2} />
              <Text style={[styles.quickActionText, activeTab === 'image' && styles.quickActionTextActive]}>
                Image
              </Text>
            </TouchableOpacity>
          </View>

          {/* File/Image Display */}
          {(activeTab === 'file' || activeTab === 'image') && content && (
            <View style={styles.fileDisplay}>
              <Text style={styles.selectedFile}>
                Selected: {content.split('/').pop() || 'No file selected'}
              </Text>
              {activeTab === 'image' && (
                <View style={styles.imageActions}>
                  <TouchableOpacity style={styles.imageActionButton} onPress={handleCameraPicker}>
                    <Camera size={16} color="#2563EB" strokeWidth={2} />
                    <Text style={styles.imageActionText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageActionButton} onPress={handleImagePicker}>
                    <ImageIcon size={16} color="#2563EB" strokeWidth={2} />
                    <Text style={styles.imageActionText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Enhanced AI Analysis Button */}
        {!showAiPreview && (
          <TouchableOpacity
            style={[styles.analyzeButton, !canAnalyze && styles.analyzeButtonDisabled]}
            onPress={handleAnalyzeContent}
            disabled={!canAnalyze}
          >
            {analyzing ? (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </View>
            ) : (
              <View style={styles.analyzeContainer}>
                <Brain size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
                <Zap size={16} color="#ffffff" strokeWidth={2} />
              </View>
            )}
          </TouchableOpacity>
        )}

        {analyzing && (
          <View style={styles.loadingSection}>
            <Sparkles size={32} color="#7C3AED" strokeWidth={2} />
            <Text style={styles.loadingText}>AI is analyzing your content...</Text>
            <Text style={styles.loadingSubtext}>Generating perfect title, summary, and tags</Text>
            <View style={styles.loadingSteps}>
              <Text style={styles.loadingStep}>✓ Reading content structure</Text>
              <Text style={styles.loadingStep}>✓ Understanding context and meaning</Text>
              <Text style={styles.loadingStep}>⚡ Creating human-readable summary</Text>
            </View>
          </View>
        )}

        {/* Enhanced AI Preview Section */}
        {showAiPreview && aiPreview && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderLeft}>
                <Sparkles size={20} color="#7C3AED" strokeWidth={2} />
                <Text style={styles.previewTitle}>AI Analysis Complete</Text>
                <Star size={16} color="#F59E0B" strokeWidth={2} />
              </View>
              <TouchableOpacity onPress={handleDiscardPreview} style={styles.discardButton}>
                <X size={16} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewContent}>
              <View style={styles.previewField}>
                <Text style={styles.previewFieldLabel}>Generated Title</Text>
                <TextInput
                  style={[
                    styles.previewInput,
                    I18nManager.isRTL && styles.rtlText
                  ]}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Edit title..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.previewField}>
                <Text style={styles.previewFieldLabel}>Generated Summary</Text>
                <TextInput
                  style={[
                    styles.previewInput, 
                    styles.previewTextArea,
                    I18nManager.isRTL && styles.rtlText
                  ]}
                  value={customSummary}
                  onChangeText={setCustomSummary}
                  placeholder="Edit summary..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {aiPreview.tags && aiPreview.tags.length > 0 && (
                <View style={styles.previewField}>
                  <Text style={styles.previewFieldLabel}>Generated Tags</Text>
                  <View style={styles.tagsContainer}>
                    {aiPreview.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={[styles.tagText, I18nManager.isRTL && styles.rtlText]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.aiQualityIndicator}>
              <Brain size={16} color="#059669" strokeWidth={2} />
              <Text style={styles.aiQualityText}>AI-powered content analysis complete</Text>
            </View>
          </View>
        )}

        {/* Enhanced Create Note Button */}
        <TouchableOpacity
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreateNote}
          disabled={!canCreate}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.createContainer}>
              <Check size={20} color="#ffffff" strokeWidth={2} />
              <Text style={styles.createButtonText}>
                {aiPreview ? 'Create Note' : 'Analyze & Create Note'}
              </Text>
              {aiPreview && <Sparkles size={16} color="#ffffff" strokeWidth={2} />}
            </View>
          )}
        </TouchableOpacity>

        {content && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  aiIndicatorText: {
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
  inputSection: {
    marginBottom: 24,
  },
  chatInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chatInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 60,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  rtlText: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  quickActionTextActive: {
    color: '#ffffff',
  },
  fileDisplay: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedFile: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    marginBottom: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  imageActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  analyzeButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  analyzeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    textAlign: 'center',
  },
  loadingSteps: {
    marginTop: 16,
    gap: 8,
  },
  loadingStep: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  discardButton: {
    padding: 4,
  },
  previewContent: {
    gap: 16,
  },
  previewField: {
    gap: 8,
  },
  previewFieldLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  previewInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  aiQualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  aiQualityText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#059669',
  },
  createButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  createContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});