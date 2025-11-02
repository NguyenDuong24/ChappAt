import { submitReport } from './services/supportService';

// Test function to check if report submission works
export const testReportSubmission = async () => {
  try {
    console.log('Testing report submission...');

    const testReport = {
      targetType: 'user',
      targetId: 'test-user-id',
      reason: 'spam',
      description: 'Test report submission',
      reporterId: 'test-reporter-id',
      images: undefined,
    };

    const testUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      username: 'Test User',
    };

    await submitReport(testReport, testUser);
    console.log('✅ Report submitted successfully!');
    return true;
  } catch (error) {
    console.error('❌ Report submission failed:', error);
    return false;
  }
};
