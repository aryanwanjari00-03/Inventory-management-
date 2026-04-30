const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  litre: {
    type: String,
    default: '1'
  },
  unit: {
    type: String,
    default: 'Litre'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Auto-calculate totalPrice before saving
inventorySchema.pre('save', function() {
  this.totalPrice = this.quantity * this.unitPrice;
  this.lastUpdated = new Date();
});

module.exports = mongoose.model('Inventory', inventorySchema);
