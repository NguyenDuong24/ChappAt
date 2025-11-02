import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import contentModerationService from '@/services/contentModerationService';
import ModerationWarningModal from './ModerationWarningModal';
import ModerationBadge, { ModerationInfo } from './ModerationBadge';

const ContentModerationDemo: React.FC = () => {
  const [testText, setTestText] = useState('');
  const [testImageUri, setTestImageUri] = useState('');
  const [results, setResults] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Test cases cho demo
  const testCases = [
    {
      name: 'Text sạch',
      text: 'Xin chào, bạn khỏe không?',
      expected: 'Clean'
    },
    {
      name: 'Text có từ ngữ không phù hợp',
      text: 'Mày là đồ ngu, đi chết đi!',
      expected: 'Profanity'
    },
    {
      name: 'Text chứa số điện thoại',
      text: 'Gọi cho tôi 0123456789',
      expected: 'Custom rule violation'
    },
    {
      name: 'Text chứa link',
      text: 'Truy cập https://example.com để biết thêm',
      expected: 'Custom rule violation'
    },
    {
      name: 'Text chứa email',
      text: 'Liên hệ test@example.com',
      expected: 'Custom rule violation'
    },
    {
      name: 'Text về tiền tệ',
      text: 'Tôi có 1000 bitcoin để bán',
      expected: 'Custom rule violation'
    }
  ];

  const handleTestText = async () => {
    if (!testText.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập text để test');
      return;
    }

    setIsLoading(true);
    try {
      const result = await contentModerationService.moderateText(testText);
      setResults({
        type: 'text',
        input: testText,
        result
      });

      if (!result.isClean) {
        setShowWarningModal(true);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi kiểm tra text');
      console.error('Error testing text:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestImage = async (uri?: string) => {
    const imageUri = uri || testImageUri;
    if (!imageUri.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập URL hình ảnh để test');
      return;
    }

    console.log('🔍 Testing image:', imageUri);
    setIsLoading(true);
    try {
      const result = await contentModerationService.moderateImage(imageUri);
      console.log('🖼️ Image result:', result);
      
      setResults({
        type: 'image',
        input: imageUri,
        result
      });

      if (result.isInappropriate) {
        Alert.alert(
          'Hình ảnh không phù hợp',
          `Lý do: ${result.reason}\nĐộ tin cậy: ${(result.confidence * 100).toFixed(1)}%`
        );
      } else {
        Alert.alert('Hình ảnh an toàn', `Độ tin cậy: ${(result.confidence * 100).toFixed(1)}%`);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi kiểm tra hình ảnh');
      console.error('Error testing image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample URLs cho test ảnh
  const imageSamples = [
    {
      name: 'URL chứa từ khóa xxx',
      url: 'https://example.com/xxx/image.jpg',
      expected: 'Blocked'
    },
    {
      name: 'Domain bị cấm (pornhub)',
      url: 'https://pornhub.com/image.png',
      expected: 'Blocked'
    },
    {
      name: 'URL có từ adult',
      url: 'https://site.com/adult/pic.gif',
      expected: 'Blocked'
    },
    {
      name: 'File extension sai',
      url: 'https://example.com/image.exe',
      expected: 'Blocked'
    },
    {
      name: 'URL bình thường',
      url: 'https://example.com/family-photo.jpg',
      expected: 'Clean'
    }
  ];

  const handleTestCase = async (testCase: any) => {
    setTestText(testCase.text);
    setIsLoading(true);
    try {
      const result = await contentModerationService.moderateText(testCase.text);
      setResults({
        type: 'text',
        input: testCase.text,
        result,
        testCase
      });
    } catch (error) {
      console.error('Error testing case:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    const { type, input, result, testCase } = results;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>📊 Kết quả kiểm tra</Text>
        
        {testCase && (
          <View style={styles.resultInfo}>
            <Text style={styles.testCaseName}>Test case: {testCase.name}</Text>
            <Text style={styles.testCaseExpected}>Mong đợi: {testCase.expected}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Input:</Text>
          <Text style={styles.inputText}>{input}</Text>
        </View>

        {type === 'text' ? (
          <View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Trạng thái:</Text>
              <ModerationBadge 
                type={result.isClean ? 'warning' : 'blocked'}
                size="small"
              />
              <Text style={[
                styles.resultValue,
                { color: result.isClean ? '#4CAF50' : '#F44336' }
              ]}>
                {result.isClean ? 'Sạch' : 'Có vấn đề'}
              </Text>
            </View>

            {!result.isClean && (
              <>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Loại vi phạm:</Text>
                  <Text style={styles.resultValue}>{result.violationType}</Text>
                </View>

                {result.filteredText && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Text đã lọc:</Text>
                    <Text style={styles.filteredText}>{result.filteredText}</Text>
                  </View>
                )}

                {result.blockedWords && result.blockedWords.length > 0 && (
                  <View>
                    <Text style={styles.resultLabel}>Từ khóa bị chặn:</Text>
                    <View style={styles.blockedWordsContainer}>
                      {result.blockedWords.map((word: string, index: number) => (
                        <View key={index} style={styles.blockedWordBadge}>
                          <Text style={styles.blockedWordText}>{word}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <ModerationInfo
                  type={result.violationType === 'profanity' ? 'filtered' : 'blocked'}
                  originalText={input}
                  filteredText={result.filteredText}
                  blockedWords={result.blockedWords}
                />
              </>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Trạng thái:</Text>
              <Text style={[
                styles.resultValue,
                { color: result.isInappropriate ? '#F44336' : '#4CAF50' }
              ]}>
                {result.isInappropriate ? 'Không phù hợp' : 'OK'}
              </Text>
            </View>

            {result.isInappropriate && (
              <>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Độ tin cậy:</Text>
                  <Text style={styles.resultValue}>
                    {(result.confidence * 100).toFixed(1)}%
                  </Text>
                </View>

                {result.reason && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Lý do:</Text>
                    <Text style={styles.resultValue}>{result.reason}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-check" size={32} color="#4CAF50" />
        <Text style={styles.title}>Content Moderation Demo</Text>
      </View>

      {/* Test text input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔤 Test Text</Text>
        <TextInput
          style={styles.textInput}
          value={testText}
          onChangeText={setTestText}
          placeholder="Nhập text để kiểm tra..."
          multiline
          numberOfLines={3}
        />
        <Button 
          mode="contained" 
          onPress={handleTestText}
          loading={isLoading}
          disabled={isLoading}
          style={styles.testButton}
        >
          Kiểm tra Text
        </Button>
      </View>

      {/* Test image input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖼️ Test Image</Text>
        <TextInput
          style={styles.textInput}
          value={testImageUri}
          onChangeText={setTestImageUri}
          placeholder="Nhập URL hình ảnh để kiểm tra..."
        />
        <Button 
          mode="contained" 
          onPress={() => handleTestImage()}
          loading={isLoading}
          disabled={isLoading}
          style={styles.testButton}
        >
          Kiểm tra Image
        </Button>
      </View>

      {/* Quick test cases */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Test Cases Nhanh - Text</Text>
        {testCases.map((testCase, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.testCaseItem,
              testCase.expected === 'Clean' ? styles.cleanCase : 
              testCase.expected === 'Profanity' ? styles.profanityCase : styles.customCase
            ]}
            onPress={() => handleTestCase(testCase)}
          >
            <Text style={styles.testCaseName}>{testCase.name}</Text>
            <Text style={styles.testCaseText}>{testCase.text}</Text>
            <Text style={styles.testCaseExpected}>Expected: {testCase.expected}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Image test samples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖼️ Test Cases Nhanh - Image</Text>
        {imageSamples.map((sample, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.testCaseItem,
              sample.expected === 'Clean' ? styles.cleanCase : styles.customCase
            ]}
            onPress={() => handleTestImage(sample.url)}
          >
            <Text style={styles.testCaseName}>{sample.name}</Text>
            <Text style={styles.testCaseText} numberOfLines={2}>{sample.url}</Text>
            <Text style={styles.testCaseExpected}>Expected: {sample.expected}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {renderResults()}

      {/* Warning Modal */}
      <ModerationWarningModal
        visible={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="Nội dung không phù hợp"
        message={results?.result ? contentModerationService.generateWarningMessage(results.result) : ''}
        violationType={results?.result?.violationType}
        blockedWords={results?.result?.blockedWords}
        onEdit={() => {
          setShowWarningModal(false);
          // Focus vào text input
        }}
      />
    </ScrollView>
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
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  testButton: {
    marginTop: 5,
  },
  testCaseButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  testCaseItem: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  cleanCase: {
    borderLeftColor: '#4CAF50',
  },
  profanityCase: {
    borderLeftColor: '#FF9800',
  },
  customCase: {
    borderLeftColor: '#2196F3',
  },
  testCaseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  testCaseText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  testCaseExpected: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  resultsContainer: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },

  inputContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  inputText: {
    fontSize: 14,
    color: '#333',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
    minWidth: 100,
  },
  resultValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  filteredText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
    flex: 1,
  },
  blockedWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    gap: 4,
  },
  blockedWordBadge: {
    backgroundColor: '#ffecb3',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  blockedWordText: {
    fontSize: 12,
    color: '#e65100',
    fontWeight: '500',
  },
});

export default ContentModerationDemo;
