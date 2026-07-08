const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  category: String,
  department: String,
  
  // AI calculated impact score (1-100)
  impactScore: {
    type: Number,
    default: 0
  },
  
  // High level priority derived from impactScore
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  
  // Number of similar complaints grouped into this issue
  duplicateCount: {
    type: Number,
    default: 1
  },
  
  // Array of complaint IDs
  linkedComplaints: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Complaint'
  }],
  
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved'],
    default: 'Open'
  },
  
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User' // Admin or Officer assigned
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Issue', issueSchema);
