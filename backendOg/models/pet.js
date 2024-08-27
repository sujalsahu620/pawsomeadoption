// models/Pet.js
const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  name: String,
  age: Number,
  breed: String,
  ownerName: String,
  ownerContact: String,
  description: String,
  images: [String], // Array to store the URLs of the uploaded images
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pet', petSchema);
