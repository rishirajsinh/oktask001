const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  testId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid',
  }
}, { timestamps: true });

// Ensure combination of email and testId is unique
studentSchema.index({ email: 1, testId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
