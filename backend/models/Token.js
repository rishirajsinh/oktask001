const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  testId: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Token', tokenSchema);
