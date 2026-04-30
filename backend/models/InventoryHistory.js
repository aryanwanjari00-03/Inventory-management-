const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  litre: {
    type: String,
    default: '1'
  },
  color: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    default: 'Litre'
  },
  action: {
    type: String,
    enum: ['added', 'updated', 'deleted'],
    required: true
  },
  oldQuantity: {
    type: Number,
    default: 0
  },
  newQuantity: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);
