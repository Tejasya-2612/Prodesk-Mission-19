import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: Number, required: true, unique: true, index: true },
  customer: { type: String, required: true, trim: true },
  issue: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'], default: 'Open' },
  assignedAgent: { type: String, default: '', trim: true },
  resolution: { type: String, default: '', trim: true }
}, { timestamps: true, versionKey: false });

export const Ticket = mongoose.model('Ticket', ticketSchema);

