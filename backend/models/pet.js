

// models/Pet.js
const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  breed: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerContact: { type: String, required: true },
  description: { type: String, required: true },
  images: [String], // Array to store the URLs of the uploaded images
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pet', petSchema);
