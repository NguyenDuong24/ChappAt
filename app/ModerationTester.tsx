import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, SafeAreaView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import contentModerationService from '../services/contentModerationService';

const ModerationTester: React.FC = () => {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Moderation Test</Text>
      </View>

      <ScrollView style={styles.content}>
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
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={testCustomText}
          >
            <Text style={styles.buttonText}>Test Text</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={testPredefinedTexts}
          >
            <Text style={[styles.buttonText, { color: '#007AFF' }]}>Test Predefined Texts</Text>
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
    padding: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#fff',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
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
