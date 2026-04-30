const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    let user = await User.findOne({ email });

    // Check if it's the admin from .env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      if (!user) {
        // Create admin user if it doesn't exist
        user = new User({
          businessName: 'Admin Business',
          ownerName: 'Administrator',
          email: adminEmail,
          mobile: '0000000000',
          password: adminPassword
        });
        await user.save();
      }
      // If user exists, we still allow login because passwords match the admin password
    } else {
      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        businessName: user.businessName,
        ownerName: user.ownerName,
        email: user.email,
        mobile: user.mobile,
        shopAddress: user.shopAddress,
        gstNumber: user.gstNumber,
        shopLogo: user.shopLogo
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        businessName: req.user.businessName,
        ownerName: req.user.ownerName,
        email: req.user.email,
        mobile: req.user.mobile,
        shopAddress: req.user.shopAddress,
        gstNumber: req.user.gstNumber,
        shopLogo: req.user.shopLogo
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
