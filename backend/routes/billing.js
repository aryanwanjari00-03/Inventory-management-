const express = require('express');
const Billing = require('../models/Billing');
const Inventory = require('../models/Inventory');
const InventoryHistory = require('../models/InventoryHistory');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all bills
router.get('/', auth, async (req, res) => {
  try {
    const bills = await Billing.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get last 3 bills
router.get('/recent', auth, async (req, res) => {
  try {
    const bills = await Billing.find({ userId: req.user._id }).sort({ date: -1 }).limit(3);
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a bill
router.post('/', auth, async (req, res) => {
  try {
    const { customerName, mobileNumber, customerAddress, items, gstApplied, paymentMode } = req.body;

    // Calculate totals
    let totalAmount = 0;
    const billItems = [];

    for (const item of items) {
      const inventoryItem = await Inventory.findOne({ _id: item.inventoryId, userId: req.user._id });
      if (!inventoryItem) {
        return res.status(404).json({ message: `Item not found: ${item.itemName}` });
      }
      if (inventoryItem.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${inventoryItem.itemName}. Available: ${inventoryItem.quantity}` });
      }

      const price = item.quantity * inventoryItem.unitPrice;
      totalAmount += price;

      billItems.push({
        itemName: inventoryItem.itemName,
        litre: inventoryItem.litre,
        color: inventoryItem.color || '',
        unit: inventoryItem.unit,
        quantity: item.quantity,
        unitPrice: inventoryItem.unitPrice,
        price
      });

      // Deduct from inventory
      const oldQuantity = inventoryItem.quantity;
      inventoryItem.quantity -= item.quantity;
      inventoryItem.totalPrice = inventoryItem.quantity * inventoryItem.unitPrice;
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save();

      // Log inventory history for billing deduction
      await new InventoryHistory({
        userId: req.user._id,
        itemName: inventoryItem.itemName,
        litre: inventoryItem.litre,
        color: inventoryItem.color,
        unit: inventoryItem.unit,
        action: 'updated',
        oldQuantity: oldQuantity,
        newQuantity: inventoryItem.quantity,
        unitPrice: inventoryItem.unitPrice
      }).save();
    }

    const gstAmount = gstApplied ? totalAmount * 0.18 : 0;
    const grandTotal = totalAmount + gstAmount;

    const bill = new Billing({
      userId: req.user._id,
      customerName,
      mobileNumber,
      customerAddress,
      items: billItems,
      totalAmount,
      gstApplied,
      gstAmount,
      grandTotal,
      paymentMode: paymentMode || 'Cash',
      date: new Date()
    });

    await bill.save();
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single bill
router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Billing.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
