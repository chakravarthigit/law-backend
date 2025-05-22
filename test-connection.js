const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Testing database connection...');
console.log(`Trying to connect to: ${process.env.MONGODB_URI}`);

// Connect to MongoDB with options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB!');
  console.log(`Connected to: ${mongoose.connection.host}`);
  console.log(`Database name: ${mongoose.connection.name}`);
  // Close the connection after successful test
  mongoose.connection.close();
  console.log('Connection closed.');
})
.catch((err) => {
  console.error('❌ Connection error:', err);
  
  // Print helpful debugging information
  console.log('\nDebugging information:');
  console.log('- Check if your MongoDB Atlas username and password are correct');
  console.log('- Verify that your IP address is whitelisted in MongoDB Atlas');
  console.log('- Ensure your cluster is running and accessible');
  console.log('- Try using a different network connection');
}); 