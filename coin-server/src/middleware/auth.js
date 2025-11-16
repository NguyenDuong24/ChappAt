const admin = require('firebase-admin');

/**
 * Middleware to verify Firebase ID token from Authorization header
 */
async function authenticateUser(req, res, next) {
  console.log('\n🔐 ========== AUTH MIDDLEWARE ==========');
  console.log('📍 Path:', req.path);
  console.log('🔍 Method:', req.method);
  
  try {
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'MISSING');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        code: 'AUTH_REQUIRED',
        message: 'Authorization header with Bearer token is required' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('🎫 Token length:', token?.length || 0);
    console.log('🎫 Token preview:', token?.substring(0, 20) + '...');
    
    if (!token) {
      console.error('❌ Token is empty');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        code: 'INVALID_TOKEN',
        message: 'Token is missing' 
      });
    }

    // Verify the token with Firebase Admin
    console.log('🔓 Verifying token with Firebase Admin...');
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('✅ Token verified successfully');
    console.log('👤 User:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    });
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    console.log('✅ ========== AUTH SUCCESS ==========\n');
    next();
  } catch (error) {
    console.error('❌ ========== AUTH ERROR ==========');
    console.error('Error:', {
      message: error.message,
      code: error.code,
      name: error.name,
    });
    console.error('=======================================\n');
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED',
        message: 'Please refresh your token and try again' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Unauthorized', 
      code: 'AUTH_FAILED',
      message: 'Invalid authentication token' 
    });
  }
}

module.exports = authenticateUser;
