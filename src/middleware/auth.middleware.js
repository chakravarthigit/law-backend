const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Development mode flag for testing without authentication
const DEV_MODE = process.env.NODE_ENV !== 'production';
const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true' || false;

// Create a dummy user for development
const dummyUser = {
  _id: 'dummy-user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user'
};

/**
 * Middleware to protect routes - only authenticated users can access
 */
exports.protect = async (req, res, next) => {
  try {
    // Check if authentication bypass is enabled for development
    if (DEV_MODE && BYPASS_AUTH) {
      console.warn('⚠️ Auth bypass enabled - using test user (DEVELOPMENT ONLY)');
      req.user = dummyUser;
      return next();
    }
    
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      // In development mode with MongoDB issues, we can continue with a dummy user
      if (DEV_MODE && (!User.db || !User.db.readyState || User.db.readyState !== 1)) {
        console.warn('⚠️ No auth token & MongoDB unavailable - using test user');
        req.user = dummyUser;
        return next();
      }
      
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if MongoDB is connected before trying to find the user
    if (!User.db || !User.db.readyState || User.db.readyState !== 1) {
      console.warn('⚠️ MongoDB not connected - authentication may not work properly');
      if (DEV_MODE) {
        console.warn('Using test user in development mode');
        req.user = dummyUser;
        return next();
      }
    }
    
    try {
      // Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        // In development mode, we can continue with a dummy user
        if (DEV_MODE) {
          console.warn('⚠️ User not found, using test user in development');
          req.user = dummyUser;
          return next();
        }
        
        return res.status(401).json({
          status: 'fail',
          message: 'The user belonging to this token no longer exists.'
        });
      }
      
      // Grant access to protected route
      req.user = currentUser;
      next();
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      
      if (DEV_MODE) {
        console.warn('⚠️ Database error, using test user in development mode');
        req.user = dummyUser;
        return next();
      }
      
      throw dbError; // Re-throw to be caught by the main catch block
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      status: 'fail',
      message: 'Unauthorized access. Please log in again.'
    });
  }
};

/**
 * Middleware to restrict access to certain roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
}; 