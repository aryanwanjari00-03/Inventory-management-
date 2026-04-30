const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  litre: { type: String },
  unit: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  price: { type: Number, required: true }
}, { _id: false });

const billingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true,
    default: ''
  },
  items: [billItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  gstApplied: {
    type: Boolean,
    default: false
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Online'],
    default: 'Cash'
  }
}, { timestamps: true });

module.exports = mongoose.model('Billing', billingSchema);
