const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from parent directory (for PWA files)
app.use(express.static(path.join(__dirname, '..')));

// PWA Routes - Serve manifest and service worker
app.get('/manifest.json', (req, res) => {
  res.type('application/json');
  res.sendFile(path.join(__dirname, '..', 'manifest.json'));
});

app.get('/service-worker.js', (req, res) => {
  res.type('application/javascript');
  res.set('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, '..', 'service-worker.js'));
});

app.get('/pwa-client.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'pwa-client.js'));
});

app.get('/offline.html', (req, res) => {
  res.type('text/html');
  res.sendFile(path.join(__dirname, '..', 'offline.html'));
});

// API Routes
app.use('/api/products', require('./src/routes/products'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/sales', require('./src/routes/sales'));
app.use('/api/vault', require('./src/routes/vault'));

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
