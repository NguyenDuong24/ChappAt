import { createSampleHotSpots } from './createSampleHotSpots';

// Script để khởi tạo data mẫu cho ứng dụng
const initializeSampleData = async () => {
  console.log('🚀 Starting sample data initialization...');
  
  try {
    // Tạo Hot Spots mẫu
    const hotSpotsCreated = await createSampleHotSpots();
    
    if (hotSpotsCreated) {
      console.log('✅ Sample data initialization completed successfully!');
      console.log('📱 You can now test the Hot Spots features in your app');
    } else {
      console.log('❌ Failed to create some sample data');
    }
  } catch (error) {
    console.error('💥 Error during sample data initialization:', error);
  }
};

// Uncomment the line below to run the initialization
// initializeSampleData();

export { initializeSampleData };
