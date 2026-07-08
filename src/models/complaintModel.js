const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Please describe the issue']
  },
  originalLanguage: {
    type: String,
    default: 'English'
  },
  translatedText: String, // If submitted in Hindi/other
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  imageUrls: [String],
  audioUrl: String,
  mediaUrl: String, // Single media file (image or audio)
  
  // AI Generated fields
  category: String,
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  department: String,
  aiSummary: String,
  
  // System fields
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Merged', 'Resolved'],
    default: 'Pending'
  },
  linkedIssue: {
    type: mongoose.Schema.ObjectId,
    ref: 'Issue' // For duplicate merging
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
