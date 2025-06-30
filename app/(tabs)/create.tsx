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
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNotesStore } from '@/lib/store';
import { useGuestMode } from '@/lib/guestContext';
import { summarizeContent, fetchUrlContent } from '@/lib/ai';
import { uploadImage, uploadDocument, validateFile, formatFileSize } from '@/lib/storage';
import {
  FileText,
  Image as ImageIcon,
  Camera,
  Upload,
  Brain,
  Sparkles,
  Check,
  X,
  CheckCircle,
  Cloud,
  CloudUpload,
} from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { SignUpPopup } from '@/components/SignUpPopup';

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

// Helper function to extract the first URL from text
function extractFirstUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s\n]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// const { width } = Dimensions.get('window'); // Commented out as not used

export default function CreateScreen() {
  const [activeTab, setActiveTab] = useState<NoteType>('text');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiPreview, setAiPreview] = useState<AIPreview | null>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSignUpPopup, setShowSignUpPopup] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const { createNote, isGuestMode } = useNotesStore();
  const { guestUsage } = useGuestMode();

  function showSweetAlert() {
    setShowSuccessModal(true);

    // Start animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 2 seconds and navigate
    setTimeout(() => {
      hideSweetAlert();
    }, 2000);
  }

  function hideSweetAlert() {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessModal(false);
      router.push('/(tabs)');
    });
  }

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

  async function uploadFileToStorage(fileInfo: FileInfo): Promise<string | null> {
    try {
      setUploading(true);
      
      // Validate file first
      const validation = validateFile(
        { name: fileInfo.name, size: fileInfo.size },
        20 * 1024 * 1024, // 20MB limit
        // Allow common file types
        activeTab === 'image' 
          ? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
          : undefined // Allow all types for documents
      );

      if (!validation.valid) {
        Alert.alert('File Error', validation.error);
        return null;
      }

      console.log('📁 Uploading file:', fileInfo.name);

      // Upload based on type
      const uploadResult = activeTab === 'image' 
        ? await uploadImage(fileInfo.uri, fileInfo.name)
        : await uploadDocument(fileInfo.uri, fileInfo.name);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      console.log('✅ File uploaded successfully:', uploadResult.url);
      return uploadResult.url!;

    } catch (error) {
      console.error('❌ File upload error:', error);
      Alert.alert(
        'Upload Error', 
        error instanceof Error ? error.message : 'Failed to upload file'
      );
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function extractFileContent(
    fileUri: string,
    fileName: string,
    uploadedUrl?: string
  ): Promise<string> {
    try {
      // For images, return a description that can be analyzed
      if (activeTab === 'image') {
        return `Image file: ${fileName}\nUploaded to: ${uploadedUrl || 'cloud storage'}\nThis is an image that has been uploaded to the note. The image can be viewed in the note details.`;
      }

      // For text files, try to read the content
      if (
        fileName.toLowerCase().endsWith('.txt') ||
        fileName.toLowerCase().endsWith('.md') ||
        fileName.toLowerCase().endsWith('.json')
      ) {
        try {
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          return `File: ${fileName}\nUploaded to: ${uploadedUrl || 'cloud storage'}\n\nContent:\n${fileContent}`;
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
      return `File: ${fileName}\nUploaded to: ${uploadedUrl || 'cloud storage'}\nSize: ${
        fileSize ? formatFileSize(fileSize) : 'Unknown'
      }\nType: ${activeTab}\n\nThis file has been uploaded and can be accessed from the note details.`;
    } catch (error) {
      console.error('Error extracting file content:', error);
      return `File: ${fileName}\nUploaded to: ${uploadedUrl || 'cloud storage'}\nThis file has been uploaded to the note.`;
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
      let fileUrl = uploadedFileUrl;

      // Handle file upload if needed
      if (selectedFile && !uploadedFileUrl) {
        fileUrl = await uploadFileToStorage(selectedFile);
        if (!fileUrl) {
          setAnalyzing(false);
          return; // Upload failed, error already shown
        }
        setUploadedFileUrl(fileUrl);
      }

      // Handle different content types
      if (activeTab === 'url' && content.trim()) {
        try {
          finalContent = await fetchUrlContent(content);
        } catch (error) {
          console.error('URL fetch error:', error);
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
          selectedFile.name,
          fileUrl || undefined
        );
      } else if (!content.trim()) {
        Alert.alert('Error', 'Please enter some content to analyze');
        setAnalyzing(false);
        return;
      }

      // Get AI analysis
      const aiResult = await summarizeContent(finalContent, activeTab, fileUrl || undefined);

      setAiPreview(aiResult);
      setCustomTitle(aiResult.title);
      setCustomSummary(aiResult.summary);
      setShowAiPreview(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze content. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCreateNote() {
    if (!content.trim() && !selectedFile) {
      Alert.alert('Error', 'Please enter some content or select a file');
      return;
    }

    // Check guest mode limits
    if (isGuestMode && guestUsage.notes >= guestUsage.maxNotes) {
      setShowSignUpPopup(true);
      return;
    }

    setLoading(true);
    try {
      let finalContent = content;
      let noteTitle = customTitle || '';
      let noteSummary = customSummary || '';
      let noteTags: string[] = [];
      let fileUrl = uploadedFileUrl;

      // Handle file upload if not already uploaded
      if (selectedFile && !uploadedFileUrl) {
        fileUrl = await uploadFileToStorage(selectedFile);
        if (!fileUrl) {
          setLoading(false);
          return; // Upload failed, error already shown
        }
        setUploadedFileUrl(fileUrl);
      }

      // Handle different content types
      if (activeTab === 'url' && content.trim()) {
        try {
          finalContent = await fetchUrlContent(content);
        } catch (error) {
          Alert.alert(
            'Error',
            'Could not fetch URL content. Please check the URL and try again.'
          );
          setLoading(false);
          return;
        }
      } else if (
        (activeTab === 'file' || activeTab === 'image') &&
        selectedFile
      ) {
        finalContent = await extractFileContent(
          selectedFile.uri,
          selectedFile.name,
          fileUrl || undefined
        );
      }

      // Use AI preview if available, otherwise analyze content
      if (aiPreview) {
        noteTitle = aiPreview.title;
        noteSummary = aiPreview.summary;
        noteTags = aiPreview.tags;
      } else {
        try {
          const result = await summarizeContent(finalContent, activeTab, fileUrl || undefined);
          noteTitle = result.title;
          noteSummary = result.summary;
          noteTags = result.tags;
        } catch (error) {
          console.error('Failed to analyze content:', error);
          // Use fallback values
          noteTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          noteSummary = content.substring(0, 200) + (content.length > 200 ? '...' : '');
        }
      }

      // Create note with AI-generated or custom data
      const noteData = {
        title: noteTitle,
        original_content: finalContent,
        summary: noteSummary,
        type: activeTab,
        tags: noteTags,
        source_url: activeTab === 'url' ? content : extractFirstUrl(finalContent),
        file_url: fileUrl, // Use the uploaded file URL
      };

      const newNote = await createNote(noteData);
      
      if (newNote) {
        showSweetAlert();
      } else {
        Alert.alert('Error', 'Failed to create note. Please try again.');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'GUEST_LIMIT_REACHED') {
        setShowSignUpPopup(true);
      } else {
        Alert.alert('Error', 'Failed to create note. Please try again.');
      }
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
    setUploadedFileUrl(null);
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
      // Clear any existing AI preview and uploaded URL since content changed
      setAiPreview(null);
      setShowAiPreview(false);
      setUploadedFileUrl(null);
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
      // Clear any existing AI preview and uploaded URL since content changed
      setAiPreview(null);
      setShowAiPreview(false);
      setUploadedFileUrl(null);
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
        // Clear any existing AI preview and uploaded URL since content changed
        setAiPreview(null);
        setShowAiPreview(false);
        setUploadedFileUrl(null);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  }

  const canAnalyze = (content.trim() || selectedFile) && !analyzing && !loading && !uploading;
  const canCreate = (content.trim() || selectedFile) && !analyzing && !loading && !uploading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Note</Text>
            <View style={styles.aiChip}>
              <Brain size={16} color={theme.colors.primary[600]} strokeWidth={1.5} />
              <Text style={styles.aiChipText}>AI-Powered</Text>
            </View>
          </View>

          {/* Content Input */}
          <View style={styles.inputSection}>
            {selectedFile && (
              <View style={styles.filePreview}>
                {activeTab === 'image' ? (
                  <Image source={{ uri: selectedFile.uri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.fileIconContainer}>
                    <FileText size={32} color={theme.colors.text.tertiary} strokeWidth={1} />
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  {selectedFile.size && (
                    <Text style={styles.fileSize}>
                      {formatFileSize(selectedFile.size)}
                    </Text>
                  )}
                  {/* Upload Status */}
                  {uploadedFileUrl ? (
                    <View style={styles.uploadStatus}>
                      <Cloud size={14} color={theme.colors.success.main} strokeWidth={1.5} />
                      <Text style={styles.uploadedText}>Uploaded</Text>
                    </View>
                  ) : uploading ? (
                    <View style={styles.uploadStatus}>
                      <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  ) : (
                    <View style={styles.uploadStatus}>
                      <CloudUpload size={14} color={theme.colors.text.tertiary} strokeWidth={1.5} />
                      <Text style={styles.pendingText}>Ready to upload</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => {
                    setSelectedFile(null);
                    setUploadedFileUrl(null);
                    setActiveTab('text');
                  }}
                >
                  <X size={16} color={theme.colors.text.secondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={content}
                onChangeText={handleContentChange}
                placeholder={
                  selectedFile
                    ? 'Add notes about this file (optional)...'
                    : activeTab === 'url'
                    ? 'Paste a URL here...'
                    : 'Write your note here...'
                }
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                textAlignVertical="top"
                keyboardType={activeTab === 'url' ? 'url' : 'default'}
                autoCapitalize={activeTab === 'url' ? 'none' : 'sentences'}
              />
              
              {/* Input Actions */}
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDocumentPicker}
                  activeOpacity={0.7}
                  disabled={uploading}
                >
                  <Upload size={20} color={uploading ? theme.colors.text.disabled : theme.colors.text.secondary} strokeWidth={1.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleImagePicker}
                  activeOpacity={0.7}
                  disabled={uploading}
                >
                  <ImageIcon size={20} color={uploading ? theme.colors.text.disabled : theme.colors.text.secondary} strokeWidth={1.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCameraPicker}
                  activeOpacity={0.7}
                  disabled={uploading}
                >
                  <Camera size={20} color={uploading ? theme.colors.text.disabled : theme.colors.text.secondary} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* AI Preview */}
          {showAiPreview && aiPreview && (
            <View style={styles.aiPreview}>
              <View style={styles.aiPreviewHeader}>
                <View style={styles.aiPreviewTitle}>
                  <Sparkles size={20} color={theme.colors.primary[600]} strokeWidth={1.5} />
                  <Text style={styles.aiPreviewTitleText}>AI Analysis</Text>
                </View>
                <TouchableOpacity onPress={handleDiscardPreview}>
                  <X size={20} color={theme.colors.text.tertiary} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>

              <View style={styles.aiPreviewContent}>
                <View style={styles.aiField}>
                  <Text style={styles.aiFieldLabel}>Title</Text>
                  <TextInput
                    style={styles.aiFieldInput}
                    value={customTitle}
                    onChangeText={setCustomTitle}
                    placeholder="Edit title..."
                    placeholderTextColor={theme.colors.text.tertiary}
                  />
                </View>

                <View style={styles.aiField}>
                  <Text style={styles.aiFieldLabel}>Summary</Text>
                  <TextInput
                    style={[styles.aiFieldInput, styles.aiFieldTextArea]}
                    value={customSummary}
                    onChangeText={setCustomSummary}
                    placeholder="Edit summary..."
                    placeholderTextColor={theme.colors.text.tertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {aiPreview.tags && aiPreview.tags.length > 0 && (
                  <View style={styles.aiField}>
                    <Text style={styles.aiFieldLabel}>Tags</Text>
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

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
              onPress={handleCreateNote}
              disabled={!canCreate}
              activeOpacity={0.8}
            >
              {loading || analyzing || uploading ? (
                <>
                  <ActivityIndicator color={theme.colors.text.inverse} size="small" />
                  <Text style={styles.createButtonText}>
                    {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Creating...'}
                  </Text>
                </>
              ) : (
                <>
                  <Check size={20} color={theme.colors.text.inverse} strokeWidth={2} />
                  <Text style={styles.createButtonText}>
                    {aiPreview ? 'Create Note' : 'Create & Analyze'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {(content || selectedFile) && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="none"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <CheckCircle size={60} color={theme.colors.success.main} strokeWidth={1.5} />
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalMessage}>Note created successfully</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Sign Up Popup */}
      <SignUpPopup
        visible={showSignUpPopup}
        onClose={() => setShowSignUpPopup(false)}
        onSignUp={() => {
          setShowSignUpPopup(false);
          router.push('/auth/signup');
        }}
        onSignIn={() => {
          setShowSignUpPopup(false);
          router.push('/auth/login');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  aiChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  inputSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  filePreview: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[100],
  },
  fileIconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  fileName: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  fileSize: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  uploadedText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.success.main,
  },
  uploadingText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  pendingText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  removeFileButton: {
    padding: theme.spacing.sm,
  },
  textInputContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  textInput: {
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    minHeight: 160,
  },
  inputActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  actionButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  aiPreview: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  aiPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  aiPreviewTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  aiPreviewTitleText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  aiPreviewContent: {
    gap: theme.spacing.md,
  },
  aiField: {
    gap: theme.spacing.sm,
  },
  aiFieldLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  aiFieldInput: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
  },
  aiFieldTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  tagText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  actions: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  clearButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.xl,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  modalMessage: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
});
