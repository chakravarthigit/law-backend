const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Generate JWT token for user authentication
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Token expires in 30 days
  });
};

/**
 * Send token in response with user data
 */
const createSendToken = (user, statusCode, res) => {
  // Generate JWT token
  const token = signToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  // Send response
  res.status(statusCode).json({
    status: 'success',
    token,
    user
  });
};

/**
 * User signup controller
 */
exports.signup = async (req, res, next) => {
  try {
    // Log request data for debugging (remove sensitive info in production)
    console.log('Signup request:', {
      name: req.body.name,
      email: req.body.email,
      // Don't log password
    });
    
    // Destructure user data from request body
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email already exists. Please use a different email address.'
      });
    }
    
    // Validate password length directly here as well
    if (password.length < 8) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Create new user
    const newUser = await User.create({
      name,
      email,
      password
    });
    
    console.log('User created successfully:', newUser._id);
    
    // Generate token and send response
    createSendToken(newUser, 201, res);
  } catch (error) {
    console.error('Signup error:', error);
    next(error);
  }
};

/**
 * User login controller
 */
exports.login = async (req, res, next) => {
  try {
    // Destructure email and password from request body
    const { email, password } = req.body;
    
    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }
    
    // Update last login time
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    
    // Generate token and send response
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * User logout - client side (clear token)
 */
exports.logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

/**
 * Get current user profile
 */
exports.getMe = async (req, res, next) => {
  try {
    // User is already available in req.user from auth middleware
    res.status(200).json({
      status: 'success',
      user: req.user
    });
  } catch (error) {
    next(error);
  }
}; 