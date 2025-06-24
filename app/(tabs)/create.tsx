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
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNotesStore } from '@/lib/store';
import { summarizeContent, fetchUrlContent } from '@/lib/ai';
import {
  FileText,
  Link2,
  Image as ImageIcon,
  Camera,
  Upload,
  Brain,
  Sparkles,
  Check,
  X,
  Zap,
  Star,
  AlertCircle,
} from 'lucide-react-native';

type NoteType = 'text' | 'url' | 'file' | 'image';

interface AIPreview {
  title: string;
  summary: string;
  tags: string[];
}

interface FileInfo {
  uri: string;
  name: string;
  size?: number;
  type?: string;
  mimeType?: string;
}

const { width } = Dimensions.get('window');

export default function CreateScreen() {
  const [activeTab, setActiveTab] = useState<NoteType>('text');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiPreview, setAiPreview] = useState<AIPreview | null>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const { createNote } = useNotesStore();

  function handleContentChange(text: string) {
    setContent(text);
    // If user is typing, switch to text mode
    if (text.trim() && activeTab !== 'text' && activeTab !== 'url') {
      setActiveTab('text');
    }
    // Clear AI preview when content changes
    if (aiPreview) {
      setAiPreview(null);
      setShowAiPreview(false);
    }
  }

  async function extractFileContent(
    fileUri: string,
    fileName: string
  ): Promise<string> {
    try {
      // For images, return a description that can be analyzed
      if (activeTab === 'image') {
        return `Image file: ${fileName}\nThis is an image that has been uploaded to the note. The image can be viewed in the note details.`;
      }

      // For text files, try to read the content
      if (
        fileName.toLowerCase().endsWith('.txt') ||
        fileName.toLowerCase().endsWith('.md') ||
        fileName.toLowerCase().endsWith('.json')
      ) {
        try {
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          return `File: ${fileName}\n\nContent:\n${fileContent}`;
        } catch (error) {
          console.log('Could not read file content:', error);
        }
      }

      // For other files, return file information
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSize =
        fileInfo.exists && !fileInfo.isDirectory && 'size' in fileInfo
          ? fileInfo.size
          : null;
      return `File: ${fileName}\nSize: ${
        fileSize ? Math.round(fileSize / 1024) : 'Unknown'
      } KB\nType: ${activeTab}\n\nThis file has been attached to the note and can be accessed from the note details.`;
    } catch (error) {
      console.error('Error extracting file content:', error);
      return `File: ${fileName}\nThis file has been attached to the note.`;
    }
  }

  async function handleAnalyzeContent() {
    if (!content.trim() && !selectedFile) {
      Alert.alert(
        'Error',
        'Please enter some content or select a file to analyze'
      );
      return;
    }

    setAnalyzing(true);
    try {
      let finalContent = content;

      // Handle different content types
      if (activeTab === 'url' && content.trim()) {
        try {
          finalContent = await fetchUrlContent(content);
        } catch (error) {
          Alert.alert(
            'Error',
            'Could not fetch URL content. Please check the URL and try again.'
          );
          setAnalyzing(false);
          return;
        }
      } else if (
        (activeTab === 'file' || activeTab === 'image') &&
        selectedFile
      ) {
        finalContent = await extractFileContent(
          selectedFile.uri,
          selectedFile.name
        );
      } else if (!content.trim()) {
        Alert.alert('Error', 'Please enter some content to analyze');
        setAnalyzing(false);
        return;
      }

      // Get AI analysis
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
    if (!content.trim() && !selectedFile) {
      Alert.alert('Error', 'Please enter some content or select a file');
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
      let fileUrl = null;

      // Handle different content types
      if (activeTab === 'url' && content.trim()) {
        try {
          finalContent = await fetchUrlContent(content);
        } catch (error) {
          Alert.alert('Error', 'Could not fetch URL content');
          setLoading(false);
          return;
        }
      } else if (
        (activeTab === 'file' || activeTab === 'image') &&
        selectedFile
      ) {
        finalContent = await extractFileContent(
          selectedFile.uri,
          selectedFile.name
        );
        fileUrl = selectedFile.uri; // Store the local file URI for now
      }

      // Create note with AI-generated or custom data
      const noteData = {
        title: customTitle || aiPreview.title,
        original_content: finalContent,
        summary: customSummary || aiPreview.summary,
        type: activeTab,
        tags: aiPreview.tags,
        source_url: activeTab === 'url' ? content : null,
        file_url: fileUrl,
      };

      const newNote = await createNote(noteData);

      if (newNote) {
        Alert.alert(
          'Success',
          'Note created successfully with AI-powered organization!',
          [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
        );
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
    setSelectedFile(null);
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
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        size: asset.fileSize,
        type: asset.type,
        mimeType: asset.mimeType,
      });
      setContent(''); // Clear text content when file is selected
      setActiveTab('image');
      // Clear any existing AI preview since content changed
      setAiPreview(null);
      setShowAiPreview(false);
    }
  }

  async function handleCameraPicker() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Camera access is required to take photos'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        size: asset.fileSize,
        type: asset.type,
        mimeType: asset.mimeType,
      });
      setContent(''); // Clear text content when file is selected
      setActiveTab('image');
      // Clear any existing AI preview since content changed
      setAiPreview(null);
      setShowAiPreview(false);
    }
  }

  async function handleDocumentPicker() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          type: asset.file?.type,
          mimeType: asset.mimeType,
        });
        setContent(''); // Clear text content when file is selected
        setActiveTab('file');
        // Clear any existing AI preview since content changed
        setAiPreview(null);
        setShowAiPreview(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  }

  const canAnalyze = (content.trim() || selectedFile) && !analyzing && !loading;
  const canCreate =
    (content.trim() || selectedFile) && aiPreview && !analyzing && !loading;

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    if (activeTab === 'image') {
      return (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: selectedFile.uri }}
            style={styles.imagePreview}
          />
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            {selectedFile.size && (
              <Text style={styles.fileSize}>
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.removeFileButton}
            onPress={() => {
              setSelectedFile(null);
              setActiveTab('text');
            }}
          >
            <X size={16} color="#EF4444" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.filePreviewContainer}>
        <FileText size={32} color="#6B7280" strokeWidth={1.5} />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {selectedFile.name}
          </Text>
          {selectedFile.size && (
            <Text style={styles.fileSize}>
              {selectedFile.size > 1024 * 1024
                ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
                : `${(selectedFile.size / 1024).toFixed(0)} KB`}
            </Text>
          )}
          {selectedFile.mimeType && (
            <Text style={styles.fileType}>{selectedFile.mimeType}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeFileButton}
          onPress={() => {
            setSelectedFile(null);
            setActiveTab('text');
          }}
        >
          <X size={16} color="#EF4444" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  };

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
        <Text style={styles.subtitle}>
          AI will automatically analyze and organize your content
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Enter your content</Text>

          {/* File Preview */}
          {selectedFile && renderFilePreview()}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={content}
              onChangeText={handleContentChange}
              placeholder={
                selectedFile
                  ? 'Add additional notes about this file (optional)...'
                  : activeTab === 'url'
                  ? 'Paste a URL (e.g., https://example.com/article)...'
                  : 'Type your content here...'
              }
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              keyboardType={activeTab === 'url' ? 'url' : 'default'}
              autoCapitalize={activeTab === 'url' ? 'none' : 'sentences'}
              autoCorrect={activeTab !== 'url'}
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  activeTab === 'file' && styles.actionButtonActive,
                ]}
                onPress={handleDocumentPicker}
              >
                <Upload
                  size={20}
                  color={activeTab === 'file' ? '#2563EB' : '#6B7280'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  activeTab === 'image' && styles.actionButtonActive,
                ]}
                onPress={handleImagePicker}
              >
                <ImageIcon
                  size={20}
                  color={activeTab === 'image' ? '#2563EB' : '#6B7280'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  activeTab === 'image' && styles.actionButtonActive,
                ]}
                onPress={handleCameraPicker}
              >
                <Camera
                  size={20}
                  color={activeTab === 'image' ? '#2563EB' : '#6B7280'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  activeTab === 'url' && styles.actionButtonActive,
                ]}
                onPress={() => {
                  // Switch to URL mode and clear file
                  setActiveTab('url');
                  setSelectedFile(null);
                  if (!content.trim()) {
                    setContent('');
                  }
                }}
              >
                <Link2
                  size={20}
                  color={activeTab === 'url' ? '#2563EB' : '#6B7280'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Enhanced AI Analysis Button */}
        {!showAiPreview && (
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              !canAnalyze && styles.analyzeButtonDisabled,
            ]}
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
            <Text style={styles.loadingText}>
              AI is analyzing your{' '}
              {activeTab === 'image'
                ? 'image'
                : activeTab === 'file'
                ? 'file'
                : 'content'}
              ...
            </Text>
            <Text style={styles.loadingSubtext}>
              Generating perfect title, summary, and tags
            </Text>
            <View style={styles.loadingSteps}>
              <Text style={styles.loadingStep}>
                ✓ Reading {activeTab} structure
              </Text>
              <Text style={styles.loadingStep}>
                ✓ Understanding context and meaning
              </Text>
              <Text style={styles.loadingStep}>
                ⚡ Creating human-readable summary
              </Text>
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
              <TouchableOpacity
                onPress={handleDiscardPreview}
                style={styles.discardButton}
              >
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

            <View style={styles.aiQualityIndicator}>
              <Brain size={16} color="#059669" strokeWidth={2} />
              <Text style={styles.aiQualityText}>
                AI-powered content analysis complete
              </Text>
            </View>
          </View>
        )}

        {/* Enhanced Create Note Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            !canCreate && styles.createButtonDisabled,
          ]}
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
              {aiPreview && (
                <Sparkles size={16} color="#ffffff" strokeWidth={2} />
              )}
            </View>
          )}
        </TouchableOpacity>

        {(content || selectedFile) && (
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
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
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
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 200,
    flex: 1,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  imagePreviewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    resizeMode: 'cover',
  },
  filePreviewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
    marginTop: 8,
  },
  fileName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  removeFileButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
