const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/products', require('./src/routes/products'));
app.use('/api/customers', require('./src/routes/customers'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler middleware (must be last)
app.use(errorHandler);

module.exports = app;
