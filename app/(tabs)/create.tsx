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
import { FileText, Link2, Image as ImageIcon, Camera, Upload, Brain, Sparkles, Check, X } from 'lucide-react-native';

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

      // If it's a URL, fetch the content
      if (activeTab === 'url') {
        try {
          finalContent = await fetchUrlContent(content);
        } catch (error) {
          Alert.alert('Error', 'Could not fetch URL content');
          setAnalyzing(false);
          return;
        }
      }

      // Get AI analysis
      const aiResult = await summarizeContent(finalContent, activeTab);
      
      setAiPreview(aiResult);
      setCustomTitle(aiResult.title);
      setCustomSummary(aiResult.summary);
      setShowAiPreview(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze content');
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
        Alert.alert('Success', 'Note created successfully!', [
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

  const tabs = [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'url', label: 'URL', icon: Link2 },
    { id: 'file', label: 'File', icon: Upload },
    { id: 'image', label: 'Image', icon: ImageIcon },
  ];

  const canAnalyze = content.trim() && !analyzing && !loading;
  const canCreate = content.trim() && aiPreview && !analyzing && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Note</Text>
        <Text style={styles.subtitle}>AI will automatically analyze and organize your content</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                placeholderTextColor="#9CA3AF"
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

        {/* AI Analysis Button */}
        {!showAiPreview && (
          <TouchableOpacity
            style={[styles.analyzeButton, !canAnalyze && styles.analyzeButtonDisabled]}
            onPress={handleAnalyzeContent}
            disabled={!canAnalyze}
          >
            {analyzing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Brain size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {analyzing && (
          <View style={styles.loadingSection}>
            <Sparkles size={32} color="#7C3AED" strokeWidth={2} />
            <Text style={styles.loadingText}>AI is analyzing your content...</Text>
            <Text style={styles.loadingSubtext}>Generating title, summary, and tags</Text>
          </View>
        )}

        {/* AI Preview Section */}
        {showAiPreview && aiPreview && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderLeft}>
                <Sparkles size={20} color="#7C3AED" strokeWidth={2} />
                <Text style={styles.previewTitle}>AI Analysis</Text>
              </View>
              <TouchableOpacity onPress={handleDiscardPreview} style={styles.discardButton}>
                <X size={16} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewContent}>
              <View style={styles.previewField}>
                <Text style={styles.previewFieldLabel}>Generated Title</Text>
                <TextInput
                  style={styles.previewInput}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Edit title..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.previewField}>
                <Text style={styles.previewFieldLabel}>Generated Summary</Text>
                <TextInput
                  style={[styles.previewInput, styles.previewTextArea]}
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
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Create Note Button */}
        <TouchableOpacity
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreateNote}
          disabled={!canCreate}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Check size={20} color="#ffffff" strokeWidth={2} />
              <Text style={styles.createButtonText}>
                {aiPreview ? 'Create Note' : 'Analyze & Create Note'}
              </Text>
            </>
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
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
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
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
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
  previewSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  createButtonDisabled: {
    opacity: 0.6,
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