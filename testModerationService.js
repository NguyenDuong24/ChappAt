// Test script để kiểm tra Content Moderation Service
const contentModerationService = require('./services/contentModerationService').default;

async function testModerationService() {
  console.log('Testing Content Moderation Service...');
  
  // Debug service status
  contentModerationService.debug();
  
  // Test các từ khác nhau
  const testTexts = [
    'hello world',
    'fuck you',
    'cặc',
    'đĩ con',
    'mày là đồ ngu',
    'vcl',
    'dm',
    'shit happens',
    'This is a normal message'
  ];
  
  console.log('\n=== Testing Text Moderation ===');
  
  for (const text of testTexts) {
    try {
      const result = await contentModerationService.moderateText(text);
      console.log(`"${text}" -> Clean: ${result.isClean}, Filtered: "${result.filteredText}", Blocked: [${result.blockedWords?.join(', ') || 'none'}]`);
    } catch (error) {
      console.error(`Error testing "${text}":`, error);
    }
  }
  
  // Wait một chút để async init hoàn thành
  setTimeout(() => {
    console.log('\n=== Testing after 2 seconds (after full init) ===');
    contentModerationService.debug();
    
    testTexts.forEach(async (text) => {
      try {
        const result = await contentModerationService.moderateText(text);
        console.log(`"${text}" -> Clean: ${result.isClean}`);
      } catch (error) {
        console.error(`Error testing "${text}":`, error);
      }
    });
  }, 2000);
}

testModerationService().catch(console.error);
