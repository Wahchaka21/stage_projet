const mongoose = require('mongoose')

const UserDeletionArchiveSchema = new mongoose.Schema({
  originalUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    index: true 
  },
  userData: {
    emailMasked: String,
    nickname: String,
    name: String,
    lastname: String,
    role: String,
    createdAt: Date,
    lastLogin: Date
  },
  deletionContext: {
    deletedAt: { 
      type: Date, 
      default: Date.now 
    },
    deletedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    deletionType: { 
      type: String, 
      required: true 
    },
    reason: String,
    ipAddress: String
  },
  dataHash: { 
    type: String, 
    required: true, 
    index: true 
  },
  keptUntil: { 
    type: Date, 
    index: true 
  }
}, { timestamps: true, versionKey: false })

module.exports = mongoose.model('UserDeletionArchive', UserDeletionArchiveSchema)