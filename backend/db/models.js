import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'WORKER'], default: 'USER' },
  createdAt: { type: Date, default: Date.now },
});

const resaleItemSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, default: '' },
  description: { type: String, required: true },
  category: { type: String, default: null },
  condition: { type: String, default: null },
  age: { type: String, default: null },
  aiDecision: { type: String, default: null },
  status: { type: String, default: 'LISTED' }, // LISTED, SOLD
  final_price: { type: Number, default: null },
  buyer_email: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const bidSchema = new mongoose.Schema({
  itemId: { type: String, required: true, index: true },
  bidderId: { type: String, required: true, index: true },
  bidderEmail: { type: String, default: '' },
  amount: { type: Number, required: true },
  status: { type: String, default: 'PENDING' }, // PENDING, ACCEPTED, REJECTED
  createdAt: { type: Date, default: Date.now },
});

const repairRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, default: '' },
  description: { type: String, required: true },
  category: { type: String, default: null },
  condition: { type: String, default: null },
  age: { type: String, default: null },
  aiDecision: { type: String, default: null },
  status: { type: String, default: 'PENDING' }, // PENDING, ACCEPTED, IN_PROGRESS, COMPLETED
  workerId: { type: String, default: null, index: true },
  workerEmail: { type: String, default: null },
  workerNotes: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const recycleRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, default: '' },
  description: { type: String, required: true },
  category: { type: String, default: null },
  condition: { type: String, default: null },
  age: { type: String, default: null },
  aiDecision: { type: String, default: null },
  choice: { type: String, default: 'RESPONSIBLE' }, // RESPONSIBLE, VALUE
  status: { type: String, default: 'PENDING' }, // PENDING, ACCEPTED, COLLECTED, PROCESSED, COMPLETED
  workerId: { type: String, default: null, index: true },
  workerEmail: { type: String, default: null },
  recyclingCenter: { type: String, default: null },
  environmentalImpact: { type: String, default: null },
  estimatedValue: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const ResaleItem = mongoose.models.ResaleItem || mongoose.model('ResaleItem', resaleItemSchema);
export const Bid = mongoose.models.Bid || mongoose.model('Bid', bidSchema);
export const RepairRequest = mongoose.models.RepairRequest || mongoose.model('RepairRequest', repairRequestSchema);
export const RecycleRequest = mongoose.models.RecycleRequest || mongoose.model('RecycleRequest', recycleRequestSchema);
