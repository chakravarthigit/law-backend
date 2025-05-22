const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = 'http://localhost:5001/api';

// Test user data
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`, // Use timestamp to avoid duplicates
  password: 'password123'
};

// Test signup API
async function testSignup() {
  console.log('\n📝 Testing signup functionality...');
  console.log('Test user:', {
    name: testUser.name,
    email: testUser.email,
    // Don't log password
  });
  
  try {
    console.log('Sending signup request to API...');
    
    const response = await axios.post(`${API_URL}/auth/signup`, testUser);
    
    console.log('✅ Signup successful!');
    console.log('\nResponse status:', response.status);
    console.log('Response data:', {
      status: response.data.status,
      token: response.data.token ? '✅ Token received' : '❌ No token',
      user: response.data.user ? {
        name: response.data.user.name,
        email: response.data.user.email,
        id: response.data.user._id
      } : '❌ No user data'
    });
    
    return {
      success: true,
      token: response.data.token,
      user: response.data.user
    };
  } catch (error) {
    console.error('❌ Signup failed:', error.response?.data || error.message);
    console.error('Error details:', error.response?.data);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', error.response.headers);
    }
    
    return { success: false };
  }
}

// Test login API
async function testLogin(email, password) {
  console.log('\n🔑 Testing login functionality...');
  
  try {
    console.log('Sending login request to API...');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('✅ Login successful!');
    console.log('\nResponse status:', response.status);
    console.log('Response data:', {
      status: response.data.status,
      token: response.data.token ? '✅ Token received' : '❌ No token',
      user: response.data.user ? {
        name: response.data.user.name,
        email: response.data.user.email,
        id: response.data.user._id
      } : '❌ No user data'
    });
    
    return {
      success: true,
      token: response.data.token
    };
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', error.response.headers);
    }
    
    return { success: false };
  }
}

// Run the tests
async function runTests() {
  try {
    // Check server status
    try {
      const response = await axios.get(`${API_URL}`);
      console.log('🚀 Server is running:', response.data);
    } catch (error) {
      console.error('⚠️ Server check failed. Make sure the server is running at ' + API_URL);
      process.exit(1);
    }
    
    // Test signup
    const signupResult = await testSignup();
    
    if (signupResult.success) {
      // Test login with same credentials
      await testLogin(testUser.email, testUser.password);
      
      // Test login with wrong password
      console.log('\nTesting login with wrong password:');
      await testLogin(testUser.email, 'wrongpassword');
    }
    
    console.log('\n🔄 Tests completed!');
  } catch (error) {
    console.error('❌ Unexpected error during tests:', error);
  }
}

// Execute tests
runTests(); 