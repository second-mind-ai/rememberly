import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ContentAnalyzer } from '@/components/ContentAnalyzer';
import { useNotesStore } from '@/lib/store';
import { ArrowLeft, Save, FileText, Link2, Image as ImageIcon } from 'lucide-react-native';

type ContentType = 'text' | 'url' | 'file' | 'image';

export default function AnalyzeScreen() {
  const [selectedType, setSelectedType] = useState<ContentType>('text');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { createNote } = useNotesStore();

  const contentTypes = [
    { id: 'text', label: 'Text', icon: FileText, placeholder: 'Paste your text content here...' },
    { id: 'url', label: 'URL', icon: Link2, placeholder: 'Paste a URL to analyze...' },
    { id: 'file', label: 'File', icon: FileText, placeholder: 'Paste file content here...' },
    { id: 'image', label: 'Image', icon: ImageIcon, placeholder: 'Describe your image content...' },
  ];

  async function handleSaveNote() {
    if (!analysisResult) {
      Alert.alert('Error', 'No analysis result to save');
      return;
    }

    setSaving(true);
    try {
      const noteData = {
        title: analysisResult.title,
        original_content: analysisResult.metadata?.originalContent || 'Analyzed content',
        summary: analysisResult.summary,
        type: selectedType,
        tags: analysisResult.tags || [],
        source_url: selectedType === 'url' ? analysisResult.metadata?.originalContent : null,
        file_url: selectedType === 'file' || selectedType === 'image' ? analysisResult.metadata?.originalContent : null,
      };

      const newNote = await createNote(noteData);
      
      if (newNote) {
        Alert.alert('Success', 'Note saved successfully!', [
          { text: 'OK', onPress: () => router.push('/(tabs)') }
        ]);
      } else {
        Alert.alert('Error', 'Failed to save note');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Save note error:', error);
    } finally {
      setSaving(false);
    }
  }

  function handleAnalysisComplete(result: any) {
    setAnalysisResult(result);
  }

  const selectedTypeData = contentTypes.find(type => type.id === selectedType);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Content Analyzer</Text>
        {analysisResult && (
          <TouchableOpacity 
            onPress={handleSaveNote} 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            <Save size={20} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.typeSelector}>
          <Text style={styles.sectionTitle}>Content Type</Text>
          <View style={styles.typeButtons}>
            {contentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeButton, isSelected && styles.typeButtonActive]}
                  onPress={() => setSelectedType(type.id as ContentType)}
                >
                  <Icon 
                    size={20} 
                    color={isSelected ? '#ffffff' : '#6B7280'} 
                    strokeWidth={2}
                  />
                  <Text style={[
                    styles.typeButtonText, 
                    isSelected && styles.typeButtonTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.analyzerSection}>
          <ContentAnalyzer
            contentType={selectedType}
            placeholder={selectedTypeData?.placeholder}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <View style={styles.infoNumber}>
                <Text style={styles.infoNumberText}>1</Text>
              </View>
              <Text style={styles.infoText}>
                Select your content type and paste your content
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoNumber}>
                <Text style={styles.infoNumberText}>2</Text>
              </View>
              <Text style={styles.infoText}>
                AI analyzes and generates a title, summary, and tags
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoNumber}>
                <Text style={styles.infoNumberText}>3</Text>
              </View>
              <Text style={styles.infoText}>
                Save the analyzed content as a note in your collection
              </Text>
            </View>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  typeSelector: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  analyzerSection: {
    marginBottom: 32,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoNumberText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
});