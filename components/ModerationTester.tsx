import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import contentModerationService from '../services/contentModerationService';

const ModerationTester: React.FC = () => {
  const [testText, setTestText] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isServiceReady, setIsServiceReady] = useState(false);

  useEffect(() => {
    // Kiểm tra service status
    const checkServiceStatus = () => {
      const ready = contentModerationService.isReady();
      setIsServiceReady(ready);
      console.log('Service ready:', ready);
      
      // Debug service
      contentModerationService.debug();
    };

    checkServiceStatus();
    
    // Kiểm tra lại sau 2 giây (để async init hoàn thành)
    const timer = setTimeout(checkServiceStatus, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const testPredefinedTexts = async () => {
    const testTexts = [
      'hello world',
      'fuck you',
      'cặc ơi',
      'đĩ con',
      'mày là đồ ngu',
      'vcl gì thế',
      'dm it',
      'shit happens',
      'This is normal'
    ];

    const newResults: string[] = [];
    
    for (const text of testTexts) {
      try {
        const result = await contentModerationService.moderateText(text);
        const resultText = `"${text}" -> ${result.isClean ? '✅ Clean' : '❌ Blocked'} (${result.filteredText || 'no filter'})`;
        newResults.push(resultText);
        console.log(resultText);
      } catch (error) {
        const errorText = `"${text}" -> Error: ${error}`;
        newResults.push(errorText);
        console.error(errorText);
      }
    }
    
    setResults(newResults);
  };

  const testCustomText = async () => {
    if (!testText.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập text để test');
      return;
    }

    try {
      const result = await contentModerationService.moderateText(testText);
      const resultText = `"${testText}" -> ${result.isClean ? '✅ Clean' : '❌ Blocked'}\nFiltered: "${result.filteredText || 'none'}"\nBlocked words: [${result.blockedWords?.join(', ') || 'none'}]`;
      
      Alert.alert('Kết quả', resultText);
      console.log(resultText);
    } catch (error) {
      Alert.alert('Lỗi', `Error: ${error}`);
      console.error('Test error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Content Moderation Tester</Text>
      
      <Text style={styles.status}>
        Service Status: {isServiceReady ? '✅ Ready' : '⏳ Loading...'}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Custom Text:</Text>
        <TextInput
          style={styles.textInput}
          value={testText}
          onChangeText={setTestText}
          placeholder="Nhập text để test..."
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={testCustomText}>
          <Text style={styles.buttonText}>Test Text</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.button} onPress={testPredefinedTexts}>
          <Text style={styles.buttonText}>Test Predefined Texts</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.result}>
            {result}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  result: {
    fontSize: 12,
    marginBottom: 5,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    fontFamily: 'monospace',
  },
});

export default ModerationTester;
