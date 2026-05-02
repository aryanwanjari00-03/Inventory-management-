const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const dns = require('dns');
const https = require('https');
dns.setServers(['8.8.8.8', '8.8.4.4']);


const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const billingRoutes = require('./routes/billing');
const settingsRoutes = require('./routes/settings');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Paint Shop API is running' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      
      // Keep Alive Logic for Render
      if (process.env.RENDER_URL) {
        console.log(`📡 Keep-alive active for: ${process.env.RENDER_URL}`);
        setInterval(() => {
          https.get(`${process.env.RENDER_URL}/api/health`, (res) => {
            console.log(`Pinged health check: ${res.statusCode}`);
          }).on('error', (err) => {
            console.error('Keep-alive ping failed:', err.message);
          });
        }, 14 * 60 * 1000); // 14 minutes
      }
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
