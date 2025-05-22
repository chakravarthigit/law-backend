const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Ensure environment variables are loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Connect to MongoDB with fallback options
 */
const connectDB = async () => {
  // Check if MongoDB URI is set
  const MONGODB_URI = process.env.MONGODB_URI;
  const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/caradb';
  
  // Log status
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI environment variable is not set or empty.');
    console.warn('Trying to connect to local MongoDB instance instead.');
  } else {
    console.log('✅ MongoDB connection string found');
  }
  
  // Modern mongoose options (remove deprecated options)
  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    // Try connecting to MongoDB Atlas first if URI is provided
    if (MONGODB_URI) {
      console.log('Attempting to connect to MongoDB Atlas...');
      try {
        const conn = await mongoose.connect(MONGODB_URI, options);
        console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
        return conn;
      } catch (atlasError) {
        console.error(`❌ Error connecting to MongoDB Atlas: ${atlasError.message}`);
        console.log('Falling back to local MongoDB...');
      }
    }
    
    // Try connecting to local MongoDB as fallback
    console.log('Attempting to connect to local MongoDB...');
    const conn = await mongoose.connect(LOCAL_MONGODB_URI, options);
    console.log(`✅ Local MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    console.log('Please make sure MongoDB is installed and running locally or check your Atlas connection string');
    
    // Don't exit the process in development to allow working without DB
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing without database connection - some features will not work');
      return null;
    }
  }
};

module.exports = connectDB; 