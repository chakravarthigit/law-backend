// Load environment variables first - must be at the top
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

// Set development environment variables for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.BYPASS_AUTH = process.env.BYPASS_AUTH || 'true';

// Regular imports
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Middleware
const errorHandler = require('./middleware/error.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const aiRoutes = require('./routes/ai.routes');
const documentRoutes = require('./routes/document.routes');

// Initialize express app
const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make uploads directory static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import database connection
const connectDB = require('./config/database.config');

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log('Database connection established');
  })
  .catch((err) => {
    console.error('Could not connect to any database:', err);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('CARA API is running');
});

// Global error handler
app.use(errorHandler);

// Handle undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server`
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 