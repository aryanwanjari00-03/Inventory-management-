const express = require('express');
const Inventory = require('../models/Inventory');
const InventoryHistory = require('../models/InventoryHistory');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all inventory items
router.get('/', auth, async (req, res) => {
  try {
    const items = await Inventory.find({ userId: req.user._id }).sort({ lastUpdated: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add inventory item
router.post('/', auth, async (req, res) => {
  try {
    const { itemName, quantity, unitPrice } = req.body;

    // Check if item already exists for this user
    const existing = await Inventory.findOne({ userId: req.user._id, itemName: { $regex: new RegExp(`^${itemName}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Item already exists. Use update instead.' });
    }

    const item = new Inventory({
      userId: req.user._id,
      itemName,
      quantity,
      unitPrice
    });
    await item.save();

    // Log history
    await new InventoryHistory({
      userId: req.user._id,
      itemName,
      action: 'added',
      oldQuantity: 0,
      newQuantity: quantity,
      unitPrice
    }).save();

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update inventory item
router.put('/:id', auth, async (req, res) => {
  try {
    const { quantity, unitPrice } = req.body;
    const item = await Inventory.findOne({ _id: req.params.id, userId: req.user._id });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const oldQuantity = item.quantity;

    if (quantity !== undefined) item.quantity = quantity;
    if (unitPrice !== undefined) item.unitPrice = unitPrice;
    await item.save();

    // Log history
    await new InventoryHistory({
      userId: req.user._id,
      itemName: item.itemName,
      action: 'updated',
      oldQuantity,
      newQuantity: item.quantity,
      unitPrice: item.unitPrice
    }).save();

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete inventory item
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Log history
    await new InventoryHistory({
      userId: req.user._id,
      itemName: item.itemName,
      action: 'deleted',
      oldQuantity: item.quantity,
      newQuantity: 0,
      unitPrice: item.unitPrice
    }).save();

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get inventory history
router.get('/history', auth, async (req, res) => {
  try {
    const history = await InventoryHistory.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
