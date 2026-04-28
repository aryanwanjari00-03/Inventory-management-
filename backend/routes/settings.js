const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get settings
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('businessName ownerName email mobile shopAddress gstNumber shopLogo');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update settings
router.put('/', auth, async (req, res) => {
  try {
    const { shopAddress, gstNumber, businessName, ownerName, mobile, shopLogo } = req.body;
    
    const updateData = {};
    if (shopAddress !== undefined) updateData.shopAddress = shopAddress;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (shopLogo !== undefined) updateData.shopLogo = shopLogo;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { returnDocument: 'after' }
    ).select('-password');

    res.json({
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

module.exports = router;
