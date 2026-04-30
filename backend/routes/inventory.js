const express = require('express');
const Inventory = require('../models/Inventory');
const InventoryHistory = require('../models/InventoryHistory');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all inventory items
router.get('/', auth, async (req, res) => {
  try {
    const items = await Inventory.find({ userId: req.user._id }).sort({ lastUpdated: -1 });
    const fixedItems = items.map(item => {
      const doc = item.toObject();
      if (doc.totalStockAdded === undefined || doc.totalStockAdded === 0) {
        doc.totalStockAdded = doc.quantity;
      }
      return doc;
    });
    res.json(fixedItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add inventory item
router.post('/', auth, async (req, res) => {
  try {
    const { itemName, quantity, unitPrice, litre, unit, color } = req.body;

    // Check if item already exists for this user with same name and litre
    const existing = await Inventory.findOne({ 
      userId: req.user._id, 
      itemName: { $regex: new RegExp(`^${itemName}$`, 'i') },
      litre: litre || '1',
      unit: unit || 'Litre',
      color: color || ''
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Item with this litre size already exists. Use update instead.' });
    }

    const item = new Inventory({
      userId: req.user._id,
      itemName,
      litre: litre || '1',
      color: color || '',
      unit: unit || 'Litre',
      quantity,
      totalStockAdded: quantity,
      unitPrice
    });
    await item.save();

    // Log history
    await new InventoryHistory({
      userId: req.user._id,
      itemName,
      litre: litre || '1',
      color: color || '',
      unit: unit || 'Litre',
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
    const { quantity, unitPrice, litre, unit, color } = req.body;
    const item = await Inventory.findOne({ _id: req.params.id, userId: req.user._id });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const oldQuantity = item.quantity;
    const qtyDiff = (quantity !== undefined) ? (Number(quantity) - oldQuantity) : 0;

    if (quantity !== undefined) item.quantity = quantity;
    if (unitPrice !== undefined) item.unitPrice = unitPrice;
    if (litre !== undefined) item.litre = litre;
    if (unit !== undefined) item.unit = unit;
    if (color !== undefined) item.color = color;

    // If quantity increased, it means more stock was added
    if (qtyDiff > 0) {
      item.totalStockAdded = (item.totalStockAdded || oldQuantity) + qtyDiff;
    }

    await item.save();

    // Log history
    await new InventoryHistory({
      userId: req.user._id,
      itemName: item.itemName,
      litre: item.litre,
      color: item.color,
      unit: item.unit,
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
      litre: item.litre,
      color: item.color,
      unit: item.unit,
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
