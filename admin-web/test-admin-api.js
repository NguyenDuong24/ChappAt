/**
 * Test Admin API Script
 * Run this to check if admin endpoints are working
 */

const API_URL = 'https://saigondating-server.onrender.com/api';

async function testAdminEndpoints() {
    console.log('🔍 Testing Admin API Endpoints...\n');

    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    try {
        const response = await fetch('https://saigondating-server.onrender.com/health');
        const data = await response.json();
        console.log('✅ Health check OK:', data);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
    }

    // Test 2: Admin routes (without auth - should return 401)
    console.log('\n2️⃣ Testing admin endpoint (should return 401 without auth)...');
    try {
        const response = await fetch(`${API_URL}/admin/wallet/stats`);
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response:', data);

        if (response.status === 401) {
            console.log('✅ Admin routes exist (returns 401 as expected)');
        } else if (response.status === 404) {
            console.warn('⚠️ Admin routes not found - may not be deployed yet');
        }
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }

    console.log('\n✅ Test complete!');
}

testAdminEndpoints();
