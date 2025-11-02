import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import contentModerationService from '../services/contentModerationService';

const ContentModerationDemo: React.FC = () => {
  const router = useRouter();
  const [testText, setTestText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const testContent = async () => {
    if (!testText.trim() && !imageUrl.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập text hoặc URL ảnh để test');
      return;
    }

    setLoading(true);
    const newResults: string[] = [];

    try {
      // Test text moderation
      if (testText.trim()) {
        const textResult = await contentModerationService.moderateText(testText.trim());
        newResults.push(`📄 TEXT: "${testText}"`);
        newResults.push(`   → Clean: ${textResult.isClean ? '✅' : '❌'}`);
        
        if (!textResult.isClean) {
          newResults.push(`   → Filtered: "${textResult.filteredText}"`);
          newResults.push(`   → Type: ${textResult.violationType}`);
          newResults.push(`   → Blocked words: [${textResult.blockedWords?.join(', ') || 'none'}]`);
        }
        newResults.push('');
      }

      // Test image moderation
      if (imageUrl.trim()) {
        const imageResult = await contentModerationService.moderateImage(imageUrl.trim());
        newResults.push(`🖼️ IMAGE: "${imageUrl}"`);
        newResults.push(`   → Safe: ${imageResult.isInappropriate ? '❌' : '✅'}`);
        newResults.push(`   → Confidence: ${(imageResult.confidence * 100).toFixed(1)}%`);
        
        if (imageResult.reason) {
          newResults.push(`   → Reason: ${imageResult.reason}`);
        }
        newResults.push('');
      }

      // Test combined moderation
      if (testText.trim() && imageUrl.trim()) {
        const combinedResult = await contentModerationService.moderateContent(
          testText.trim(),
          imageUrl.trim()
        );
        
        newResults.push(`🔄 COMBINED RESULT:`);
        newResults.push(`   → Overall Clean: ${combinedResult.isContentClean ? '✅' : '❌'}`);
        newResults.push('');
      }

    } catch (error) {
      newResults.push(`❌ ERROR: ${error}`);
    }

    setResults(newResults);
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
    setTestText('');
    setImageUrl('');
  };

  const testPredefinedCases = async () => {
    const testCases = [
      { text: 'Hello world, this is a normal message', image: null },
      { text: 'fuck you asshole', image: null },
      { text: 'cặc đĩ mẹ kiếp', image: null },
      { text: 'vcl dm ngu vãi', image: null },
      { text: 'This is fine', image: 'https://example.com/normal-image.jpg' },
      { text: 'Bad content', image: 'https://pornhub.com/bad-image.jpg' },
    ];

    setLoading(true);
    const allResults: string[] = [];

    for (const testCase of testCases) {
      try {
        allResults.push(`🧪 TEST CASE:`);
        allResults.push(`   Text: "${testCase.text}"`);
        if (testCase.image) allResults.push(`   Image: "${testCase.image}"`);

        const result = await contentModerationService.moderateContent(
          testCase.text,
          testCase.image
        );

        allResults.push(`   → Overall Clean: ${result.isContentClean ? '✅' : '❌'}`);
        
        if (result.textResult && !result.textResult.isClean) {
          allResults.push(`   → Text Issues: ${result.textResult.blockedWords?.join(', ')}`);
        }
        
        if (result.imageResult && result.imageResult.isInappropriate) {
          allResults.push(`   → Image Issues: ${result.imageResult.reason}`);
        }
        
        allResults.push('');
      } catch (error) {
        allResults.push(`   → ERROR: ${error}`);
        allResults.push('');
      }
    }

    setResults(allResults);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Moderation Demo</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Custom Content</Text>
          
          <TextInput
            style={styles.textInput}
            value={testText}
            onChangeText={setTestText}
            placeholder="Nhập text để test... (ví dụ: fuck, cặc, đĩ)"
            multiline
            numberOfLines={3}
          />

          <TextInput
            style={styles.textInput}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="Nhập URL ảnh để test... (ví dụ: https://example.com/image.jpg)"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={testContent}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Test Content</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={testPredefinedCases}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: '#007AFF' }]}>
                Test All Cases
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.clearButton]} 
            onPress={clearResults}
          >
            <Text style={[styles.buttonText, { color: '#FF3B30' }]}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            <View style={styles.resultsContainer}>
              {results.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Quick Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tests</Text>
          <View style={styles.quickTestsContainer}>
            <TouchableOpacity 
              style={styles.quickTestButton} 
              onPress={() => {
                setTestText('fuck you bitch');
                setImageUrl('');
              }}
            >
              <Text style={styles.quickTestText}>English Bad Words</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickTestButton} 
              onPress={() => {
                setTestText('cặc đĩ mẹ kiếp vcl dm');
                setImageUrl('');
              }}
            >
              <Text style={styles.quickTestText}>Vietnamese Bad Words</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickTestButton} 
              onPress={() => {
                setTestText('');
                setImageUrl('https://pornhub.com/test-image.jpg');
              }}
            >
              <Text style={styles.quickTestText}>Bad Image URL</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickTestButton} 
              onPress={() => {
                setTestText('Hello world, nice day!');
                setImageUrl('https://example.com/nice-photo.jpg');
              }}
            >
              <Text style={styles.quickTestText}>Clean Content</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Status</Text>
          <Text style={styles.statusText}>
            Ready: {contentModerationService.isReady() ? '✅ Yes' : '❌ No'}
          </Text>
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => contentModerationService.debug()}
          >
            <Text style={styles.debugButtonText}>Debug Service (Check Console)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 16,
  },
  quickTestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTestButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    minWidth: '48%',
  },
  quickTestText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  debugButton: {
    backgroundColor: '#6c757d',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default ContentModerationDemo;
