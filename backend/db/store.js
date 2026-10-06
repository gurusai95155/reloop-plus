import mongoose from 'mongoose';
import { User, ResaleItem, Bid, RepairRequest, RecycleRequest } from './models.js';

let isMongoConnected = false;

// ----------------------------------------------------
// In-Memory Storage Fallback (zero-config local/dev)
// ----------------------------------------------------
const memory = {
  users: new Map(),
  items: [],
  bids: [],
  repairRequests: [],
  recycleRequests: [],
  nextUserId: 1,
  nextItemId: 1,
  nextBidId: 1,
  nextRepairId: 1,
  nextRecycleId: 1,
};

function seedMemory() {
  if (memory.items.length > 0) return;
  const now = new Date().toISOString();

  // Demo users
  memory.users.set('user@example.com', { id: '1', email: 'user@example.com', password: 'password123', role: 'USER' });
  memory.users.set('worker@example.com', { id: '2', email: 'worker@example.com', password: 'password123', role: 'WORKER' });
  memory.nextUserId = 3;

  // Demo resale items
  memory.items.push(
    { id: '1', userId: '1', userEmail: 'user@example.com', description: 'Vintage wooden chair', category: 'Furniture', condition: 'Good', age: '5 years', aiDecision: 'RESALE', status: 'SOLD', createdAt: now, final_price: 25, buyer_email: 'buyer@example.com' },
    { id: '2', userId: '2', userEmail: 'worker@example.com', description: 'Gently used bicycle', category: 'Sports', condition: 'Like new', age: '1 year', aiDecision: 'RESALE', status: 'LISTED', createdAt: now },
    { id: '3', userId: '1', userEmail: 'user@example.com', description: 'Coffee maker', category: 'Electronics', condition: 'Good', age: '2 years', aiDecision: 'RESALE', status: 'LISTED', createdAt: now },
    { id: '4', userId: '2', userEmail: 'worker@example.com', description: 'Bookshelf', category: 'Furniture', condition: 'Fair', age: '3 years', aiDecision: 'RESALE', status: 'LISTED', createdAt: now }
  );
  memory.nextItemId = 5;

  // Demo repair request
  memory.repairRequests.push({
    id: '1',
    userId: '1',
    userEmail: 'user@example.com',
    description: 'Laptop screen repair',
    category: 'Electronics',
    condition: 'Broken screen',
    age: '3 years',
    aiDecision: 'REPAIR',
    status: 'COMPLETED',
    workerId: '2',
    workerEmail: 'worker@example.com',
    workerNotes: 'Screen replaced successfully',
    createdAt: now,
    updatedAt: now,
  });
  memory.nextRepairId = 2;

  // Demo recycle request
  memory.recycleRequests.push({
    id: '1',
    userId: '1',
    userEmail: 'user@example.com',
    description: 'Old printer',
    category: 'Electronics',
    condition: 'Non-working',
    age: '8 years',
    aiDecision: 'RECYCLE',
    choice: 'RESPONSIBLE',
    status: 'COMPLETED',
    workerId: '2',
    workerEmail: 'worker@example.com',
    recyclingCenter: 'E-Waste Center',
    environmentalImpact: 'Materials recovered',
    createdAt: now,
    updatedAt: now,
  });
  memory.nextRecycleId = 2;
}
seedMemory();

// Helper to format Mongo docs to match the application interface
function toJSON(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = String(obj._id || obj.id);
  delete obj.__v;
  return obj;
}

async function findDocById(Model, id) {
  const idStr = String(id || '');
  if (!idStr) return null;
  if (mongoose.isValidObjectId(idStr)) {
    const doc = await Model.findById(idStr);
    if (doc) return doc;
  }
  return await Model.findOne({ $or: [{ _id: idStr }, { id: idStr }] }).catch(() => null);
}

// ----------------------------------------------------
// Database Initialization (MongoDB)
// ----------------------------------------------------
export async function initDb() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || (
    process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mongodb') ? process.env.DATABASE_URL : null
  );

  if (!mongoUri) {
    console.log('[Store] No MONGODB_URI detected. Running with in-memory storage fallback.');
    return;
  }

  console.log('[Store] Connecting to MongoDB...');
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log('[Store] Connected to MongoDB successfully!');

    // Seed demo data into MongoDB if new database
    await seedMongo();
  } catch (err) {
    console.warn(`[Store] MongoDB connection failed: ${err.message}. Seamlessly falling back to in-memory store.`);
    isMongoConnected = false;
  }
}

async function seedMongo() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('[Store] Seeding initial demo data to MongoDB...');
      const user = await User.create({ email: 'user@example.com', password: 'password123', role: 'USER' });
      const worker = await User.create({ email: 'worker@example.com', password: 'password123', role: 'WORKER' });

      await ResaleItem.create([
        {
          userId: user.id,
          userEmail: user.email,
          description: 'Vintage wooden chair',
          category: 'Furniture',
          condition: 'Good',
          age: '5 years',
          aiDecision: 'RESALE',
          status: 'SOLD',
          final_price: 25,
          buyer_email: 'buyer@example.com',
        },
        {
          userId: worker.id,
          userEmail: worker.email,
          description: 'Gently used bicycle',
          category: 'Sports',
          condition: 'Like new',
          age: '1 year',
          aiDecision: 'RESALE',
          status: 'LISTED',
        },
        {
          userId: user.id,
          userEmail: user.email,
          description: 'Coffee maker',
          category: 'Electronics',
          condition: 'Good',
          age: '2 years',
          aiDecision: 'RESALE',
          status: 'LISTED',
        },
        {
          userId: worker.id,
          userEmail: worker.email,
          description: 'Bookshelf',
          category: 'Furniture',
          condition: 'Fair',
          age: '3 years',
          aiDecision: 'RESALE',
          status: 'LISTED',
        },
      ]);

      await RepairRequest.create({
        userId: user.id,
        userEmail: user.email,
        description: 'Laptop screen repair',
        category: 'Electronics',
        condition: 'Broken screen',
        age: '3 years',
        aiDecision: 'REPAIR',
        status: 'COMPLETED',
        workerId: worker.id,
        workerEmail: worker.email,
        workerNotes: 'Screen replaced successfully',
      });

      await RecycleRequest.create({
        userId: user.id,
        userEmail: user.email,
        description: 'Old printer',
        category: 'Electronics',
        condition: 'Non-working',
        age: '8 years',
        aiDecision: 'RECYCLE',
        choice: 'RESPONSIBLE',
        status: 'COMPLETED',
        workerId: worker.id,
        workerEmail: worker.email,
        recyclingCenter: 'E-Waste Center',
        environmentalImpact: 'Materials recovered',
      });
      console.log('[Store] Seeded demo users and marketplace items into MongoDB.');
    }
  } catch (seedErr) {
    console.warn('[Store] Mongo seeding warning:', seedErr.message);
  }
}

export function isDbConnected() {
  return isMongoConnected;
}

// ----------------------------------------------------
// Unified Store Methods: Users & Auth
// ----------------------------------------------------
export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (isMongoConnected) {
    try {
      const user = await User.findOne({ email: normalized });
      return user ? toJSON(user) : null;
    } catch (err) {
      console.warn('[Store] MongoDB findUserByEmail error:', err.message);
    }
  }
  return memory.users.get(normalized) || null;
}

export async function createUser({ email, password, role }) {
  const normalized = String(email).trim().toLowerCase();
  if (isMongoConnected) {
    try {
      const doc = await User.create({ email: normalized, password: String(password), role });
      return toJSON(doc);
    } catch (err) {
      console.warn('[Store] MongoDB createUser error:', err.message);
    }
  }
  const user = {
    id: String(memory.nextUserId++),
    email: normalized,
    password: String(password),
    role,
  };
  memory.users.set(normalized, user);
  return { id: user.id, email: user.email, role: user.role };
}

// ----------------------------------------------------
// Unified Store Methods: Resale & Bids
// ----------------------------------------------------
export async function getListedResaleItems() {
  if (isMongoConnected) {
    try {
      const docs = await ResaleItem.find({ status: 'LISTED' }).sort({ createdAt: -1 });
      return docs.map(toJSON);
    } catch (err) {
      console.warn('[Store] MongoDB getListedResaleItems error:', err.message);
    }
  }
  return memory.items.filter((i) => i.status === 'LISTED');
}

export async function getResaleItemById(id) {
  const itemIdStr = String(id);
  if (isMongoConnected) {
    try {
      const itemDoc = await findDocById(ResaleItem, itemIdStr);
      if (!itemDoc) return null;
      const item = toJSON(itemDoc);
      const bids = await Bid.find({ itemId: item.id }).sort({ createdAt: 1 });
      item.bids = bids.map((b) => ({ ...toJSON(b), amount: Number(b.amount) }));
      return item;
    } catch (err) {
      console.warn('[Store] MongoDB getResaleItemById error:', err.message);
    }
  }

  const item = memory.items.find((i) => String(i.id) === itemIdStr);
  if (!item) return null;
  const itemBids = memory.bids.filter((b) => String(b.itemId) === itemIdStr);
  return { ...item, bids: itemBids };
}

export async function createResaleItem({ userId, userEmail, description, category, condition, age, aiDecision }) {
  if (isMongoConnected) {
    try {
      const doc = await ResaleItem.create({
        userId: String(userId),
        userEmail: userEmail || '',
        description: String(description).slice(0, 2000),
        category: category || null,
        condition: condition || null,
        age: age || null,
        aiDecision: aiDecision || null,
        status: 'LISTED',
      });
      return toJSON(doc);
    } catch (err) {
      console.warn('[Store] MongoDB createResaleItem error:', err.message);
    }
  }

  const item = {
    id: String(memory.nextItemId++),
    userId: String(userId),
    userEmail: userEmail || '',
    description: String(description).slice(0, 2000),
    category: category || null,
    condition: condition || null,
    age: age || null,
    aiDecision: aiDecision || null,
    status: 'LISTED',
    createdAt: new Date().toISOString(),
  };
  memory.items.push(item);
  return item;
}

export async function addBid({ itemId, bidderId, bidderEmail, amount }) {
  const itemIdStr = String(itemId);
  if (isMongoConnected) {
    try {
      const doc = await Bid.create({
        itemId: itemIdStr,
        bidderId: String(bidderId),
        bidderEmail: bidderEmail || '',
        amount: Number(amount) || 0,
        status: 'PENDING',
      });
      return { ...toJSON(doc), amount: Number(doc.amount) };
    } catch (err) {
      console.warn('[Store] MongoDB addBid error:', err.message);
    }
  }

  const bid = {
    id: String(memory.nextBidId++),
    itemId: itemIdStr,
    bidderId: String(bidderId),
    bidderEmail: bidderEmail || '',
    amount: Number(amount) || 0,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  memory.bids.push(bid);
  return bid;
}

export async function acceptBid({ itemId, bidId, ownerUserId }) {
  const itemIdStr = String(itemId);
  const bidIdStr = String(bidId);

  if (isMongoConnected) {
    try {
      const item = await getResaleItemById(itemIdStr);
      if (!item) return { error: 'Item not found', status: 404 };
      if (String(item.userId) !== String(ownerUserId)) return { error: 'Only owner can accept', status: 403 };

      const bidDoc = await findDocById(Bid, bidIdStr);
      if (!bidDoc) return { error: 'Bid not found', status: 404 };
      if (bidDoc.status !== 'PENDING') return { error: 'Bid already resolved', status: 400 };

      bidDoc.status = 'ACCEPTED';
      await bidDoc.save();

      // Reject other bids for this item
      await Bid.updateMany(
        { itemId: item.id, _id: { $ne: bidDoc._id } },
        { status: 'REJECTED' }
      );

      // Mark item as SOLD
      await ResaleItem.updateOne(
        { _id: item._id || item.id },
        { status: 'SOLD', final_price: bidDoc.amount, buyer_email: bidDoc.bidderEmail || '' }
      );

      const updated = await getResaleItemById(itemIdStr);
      return { item: updated, bid: { ...toJSON(bidDoc), status: 'ACCEPTED' } };
    } catch (err) {
      console.warn('[Store] MongoDB acceptBid error:', err.message);
    }
  }

  const item = memory.items.find((i) => String(i.id) === itemIdStr);
  const bid = memory.bids.find((b) => String(b.id) === bidIdStr && String(b.itemId) === itemIdStr);
  if (!item || !bid) return { error: 'Not found', status: 404 };
  if (String(item.userId) !== String(ownerUserId)) return { error: 'Only owner can accept', status: 403 };
  if (bid.status !== 'PENDING') return { error: 'Bid already resolved', status: 400 };

  bid.status = 'ACCEPTED';
  memory.bids.filter((b) => String(b.itemId) === itemIdStr && String(b.id) !== bidIdStr).forEach((b) => (b.status = 'REJECTED'));
  item.status = 'SOLD';
  item.final_price = bid.amount;
  item.buyer_email = bid.bidderEmail;
  return { item, bid };
}

export async function rejectBid({ itemId, bidId, ownerUserId }) {
  const itemIdStr = String(itemId);
  const bidIdStr = String(bidId);

  if (isMongoConnected) {
    try {
      const item = await getResaleItemById(itemIdStr);
      if (!item) return { error: 'Item not found', status: 404 };
      if (String(item.userId) !== String(ownerUserId)) return { error: 'Only owner can reject', status: 403 };

      const bidDoc = await findDocById(Bid, bidIdStr);
      if (!bidDoc) return { error: 'Bid not found', status: 404 };

      bidDoc.status = 'REJECTED';
      await bidDoc.save();
      return { bid: toJSON(bidDoc) };
    } catch (err) {
      console.warn('[Store] MongoDB rejectBid error:', err.message);
    }
  }

  const item = memory.items.find((i) => String(i.id) === itemIdStr);
  const bid = memory.bids.find((b) => String(b.id) === bidIdStr && String(b.itemId) === itemIdStr);
  if (!item || !bid) return { error: 'Not found', status: 404 };
  if (String(item.userId) !== String(ownerUserId)) return { error: 'Only owner can reject', status: 403 };
  bid.status = 'REJECTED';
  return { bid };
}

export async function getSellerItemsWithBids(userId) {
  const uid = String(userId);
  if (isMongoConnected) {
    try {
      const items = await ResaleItem.find({ userId: uid }).sort({ createdAt: -1 });
      const result = [];
      for (const rawItem of items) {
        const item = toJSON(rawItem);
        const bids = await Bid.find({ itemId: item.id }).sort({ amount: -1 });
        result.push({
          ...item,
          bids: bids.map((b) => ({ ...toJSON(b), amount: Number(b.amount) })),
        });
      }
      return result;
    } catch (err) {
      console.warn('[Store] MongoDB getSellerItemsWithBids error:', err.message);
    }
  }

  const userItems = memory.items.filter((i) => String(i.userId) === uid);
  return userItems.map((item) => {
    const itemBids = memory.bids.filter((b) => String(b.itemId) === String(item.id));
    return { ...item, bids: itemBids };
  });
}

export async function getMarketplaceItems(excludeUserId) {
  const excludeIdStr = excludeUserId != null ? String(excludeUserId) : null;
  if (isMongoConnected) {
    try {
      const query = { status: 'LISTED' };
      if (excludeIdStr) {
        query.userId = { $ne: excludeIdStr };
      }
      const items = await ResaleItem.find(query).sort({ createdAt: -1 });
      const result = [];
      for (const rawItem of items) {
        const item = toJSON(rawItem);
        const bids = await Bid.find({ itemId: item.id }).sort({ amount: -1 });
        result.push({
          ...item,
          owner_email: item.userEmail,
          bids: bids.map((b) => ({ ...toJSON(b), amount: Number(b.amount), bidder_email: b.bidderEmail })),
        });
      }
      return result;
    } catch (err) {
      console.warn('[Store] MongoDB getMarketplaceItems error:', err.message);
    }
  }

  const items = memory.items.filter(
    (i) => i.status === 'LISTED' && (!excludeIdStr || String(i.userId) !== excludeIdStr)
  );
  return items.map((item) => ({
    ...item,
    owner_email: item.userEmail,
    bids: memory.bids
      .filter((b) => String(b.itemId) === String(item.id))
      .map((b) => ({ ...b, bidder_email: b.bidderEmail })),
  }));
}

export async function getMyBidsWithItemDetails(bidderId) {
  const bidIdStr = String(bidderId);
  if (isMongoConnected) {
    try {
      const bids = await Bid.find({ bidderId: bidIdStr }).sort({ createdAt: -1 });
      const result = [];
      for (const rawBid of bids) {
        const b = toJSON(rawBid);
        const item = await findDocById(ResaleItem, b.itemId);
        result.push({
          ...b,
          amount: Number(b.amount),
          bidder_email: b.bidderEmail,
          item_description: item ? item.description : 'Unknown item',
          seller_email: item ? item.userEmail : 'Unknown seller',
        });
      }
      return result;
    } catch (err) {
      console.warn('[Store] MongoDB getMyBidsWithItemDetails error:', err.message);
    }
  }

  const userBids = memory.bids.filter((b) => String(b.bidderId) === bidIdStr);
  return userBids.map((b) => {
    const item = memory.items.find((i) => String(i.id) === String(b.itemId));
    return {
      ...b,
      bidder_email: b.bidderEmail,
      item_description: item?.description || 'Unknown item',
      seller_email: item?.userEmail || 'Unknown seller',
    };
  });
}

// ----------------------------------------------------
// Unified Store Methods: Repair Requests
// ----------------------------------------------------
export async function getRepairRequests({ userId, workerId, status } = {}) {
  if (isMongoConnected) {
    try {
      const filter = {};
      if (userId) filter.userId = String(userId);
      if (workerId) filter.workerId = String(workerId);
      if (status) filter.status = status;
      const docs = await RepairRequest.find(filter).sort({ createdAt: -1 });
      return docs.map(toJSON);
    } catch (err) {
      console.warn('[Store] MongoDB getRepairRequests error:', err.message);
    }
  }

  let list = [...memory.repairRequests];
  if (userId) list = list.filter((r) => String(r.userId) === String(userId));
  if (workerId) list = list.filter((r) => String(r.workerId) === String(workerId));
  if (status) list = list.filter((r) => r.status === status);
  return list;
}

export async function createRepairRequest(data) {
  const now = new Date().toISOString();
  if (isMongoConnected) {
    try {
      const doc = await RepairRequest.create({
        userId: String(data.userId),
        userEmail: data.userEmail || '',
        description: String(data.description).slice(0, 2000),
        category: data.category || null,
        condition: data.condition || null,
        age: data.age || null,
        aiDecision: data.aiDecision || null,
        status: 'PENDING',
        workerId: null,
        workerEmail: null,
      });
      return toJSON(doc);
    } catch (err) {
      console.warn('[Store] MongoDB createRepairRequest error:', err.message);
    }
  }

  const req_ = {
    id: String(memory.nextRepairId++),
    userId: String(data.userId),
    userEmail: data.userEmail || '',
    description: String(data.description).slice(0, 2000),
    category: data.category || null,
    condition: data.condition || null,
    age: data.age || null,
    aiDecision: data.aiDecision || null,
    status: 'PENDING',
    workerId: null,
    workerEmail: null,
    createdAt: now,
    updatedAt: now,
  };
  memory.repairRequests.push(req_);
  return req_;
}

export async function acceptRepairRequest(id, workerId, workerEmail) {
  const idStr = String(id);
  const now = new Date().toISOString();

  if (isMongoConnected) {
    try {
      const reqDoc = await findDocById(RepairRequest, idStr);
      if (!reqDoc || reqDoc.status !== 'PENDING') return null;
      reqDoc.status = 'ACCEPTED';
      reqDoc.workerId = String(workerId);
      reqDoc.workerEmail = workerEmail || '';
      reqDoc.updatedAt = new Date();
      await reqDoc.save();
      return toJSON(reqDoc);
    } catch (err) {
      console.warn('[Store] MongoDB acceptRepairRequest error:', err.message);
    }
  }

  const r = memory.repairRequests.find((x) => String(x.id) === idStr);
  if (!r || r.status !== 'PENDING') return null;
  r.workerId = String(workerId);
  r.workerEmail = workerEmail || '';
  r.status = 'ACCEPTED';
  r.updatedAt = now;
  return r;
}

export async function updateRepairStatus(id, status) {
  const idStr = String(id);
  const now = new Date().toISOString();

  if (isMongoConnected) {
    try {
      const reqDoc = await findDocById(RepairRequest, idStr);
      if (!reqDoc) return null;
      reqDoc.status = status;
      reqDoc.updatedAt = new Date();
      await reqDoc.save();
      return toJSON(reqDoc);
    } catch (err) {
      console.warn('[Store] MongoDB updateRepairStatus error:', err.message);
    }
  }

  const r = memory.repairRequests.find((x) => String(x.id) === idStr);
  if (!r) return null;
  r.status = status;
  r.updatedAt = now;
  return r;
}

// ----------------------------------------------------
// Unified Store Methods: Recycle Requests
// ----------------------------------------------------
export async function getRecycleRequests({ userId, workerId, status } = {}) {
  if (isMongoConnected) {
    try {
      const filter = {};
      if (userId) filter.userId = String(userId);
      if (workerId) filter.workerId = String(workerId);
      if (status) filter.status = status;
      const docs = await RecycleRequest.find(filter).sort({ createdAt: -1 });
      return docs.map(toJSON);
    } catch (err) {
      console.warn('[Store] MongoDB getRecycleRequests error:', err.message);
    }
  }

  let list = [...memory.recycleRequests];
  if (userId) list = list.filter((r) => String(r.userId) === String(userId));
  if (workerId) list = list.filter((r) => String(r.workerId) === String(workerId));
  if (status) list = list.filter((r) => r.status === status);
  return list;
}

export async function createRecycleRequest(data) {
  const now = new Date().toISOString();
  const choice = data.choice === 'VALUE' ? 'VALUE' : 'RESPONSIBLE';
  const estimatedValue = choice === 'VALUE' ? Math.round(5 + Math.random() * 45) : null;

  if (isMongoConnected) {
    try {
      const doc = await RecycleRequest.create({
        userId: String(data.userId),
        userEmail: data.userEmail || '',
        description: String(data.description).slice(0, 2000),
        category: data.category || null,
        condition: data.condition || null,
        age: data.age || null,
        aiDecision: data.aiDecision || null,
        choice,
        estimatedValue,
        status: 'PENDING',
        workerId: null,
        workerEmail: null,
      });
      return toJSON(doc);
    } catch (err) {
      console.warn('[Store] MongoDB createRecycleRequest error:', err.message);
    }
  }

  const req_ = {
    id: String(memory.nextRecycleId++),
    userId: String(data.userId),
    userEmail: data.userEmail || '',
    description: String(data.description).slice(0, 2000),
    category: data.category || null,
    condition: data.condition || null,
    age: data.age || null,
    aiDecision: data.aiDecision || null,
    choice,
    status: 'PENDING',
    workerId: null,
    workerEmail: null,
    estimatedValue,
    createdAt: now,
    updatedAt: now,
  };
  memory.recycleRequests.push(req_);
  return req_;
}

export async function acceptRecycleRequest(id, workerId, workerEmail) {
  const idStr = String(id);
  const now = new Date().toISOString();

  if (isMongoConnected) {
    try {
      const reqDoc = await findDocById(RecycleRequest, idStr);
      if (!reqDoc || reqDoc.status !== 'PENDING') return null;
      reqDoc.status = 'ACCEPTED';
      reqDoc.workerId = String(workerId);
      reqDoc.workerEmail = workerEmail || '';
      reqDoc.updatedAt = new Date();
      await reqDoc.save();
      return toJSON(reqDoc);
    } catch (err) {
      console.warn('[Store] MongoDB acceptRecycleRequest error:', err.message);
    }
  }

  const r = memory.recycleRequests.find((x) => String(x.id) === idStr);
  if (!r || r.status !== 'PENDING') return null;
  r.workerId = String(workerId);
  r.workerEmail = workerEmail || '';
  r.status = 'ACCEPTED';
  r.updatedAt = now;
  return r;
}

export async function updateRecycleStatus(id, status) {
  const idStr = String(id);
  const now = new Date().toISOString();

  if (isMongoConnected) {
    try {
      const reqDoc = await findDocById(RecycleRequest, idStr);
      if (!reqDoc) return null;
      reqDoc.status = status;
      reqDoc.updatedAt = new Date();
      await reqDoc.save();
      return toJSON(reqDoc);
    } catch (err) {
      console.warn('[Store] MongoDB updateRecycleStatus error:', err.message);
    }
  }

  const r = memory.recycleRequests.find((x) => String(x.id) === idStr);
  if (!r) return null;
  r.status = status;
  r.updatedAt = now;
  return r;
}

// ----------------------------------------------------
// Aggregated User History
// ----------------------------------------------------
export async function getUserHistory(userId) {
  const uid = String(userId);
  const history = [];

  if (isMongoConnected) {
    try {
      const soldItems = await ResaleItem.find({ userId: uid, status: 'SOLD' });
      soldItems.forEach((r) => {
        history.push({
          id: `resale-${r._id}`,
          type: 'RESALE',
          description: r.description,
          category: r.category,
          condition: r.condition,
          status: r.status,
          final_price: r.final_price ? Number(r.final_price) : null,
          buyer_email: r.buyer_email,
          created_at: r.createdAt,
        });
      });

      const repairReqs = await RepairRequest.find({ userId: uid });
      repairReqs.forEach((r) => {
        history.push({
          id: `repair-${r._id}`,
          type: 'REPAIR',
          description: r.description,
          category: r.category,
          condition: r.condition,
          status: r.status,
          worker_notes: r.workerNotes,
          estimated_completion: r.updatedAt,
          created_at: r.createdAt,
        });
      });

      const recycleReqs = await RecycleRequest.find({ userId: uid });
      recycleReqs.forEach((r) => {
        history.push({
          id: `recycle-${r._id}`,
          type: 'RECYCLE',
          description: r.description,
          category: r.category,
          condition: r.condition,
          status: r.status,
          recycling_center: r.recyclingCenter,
          environmental_impact: r.environmentalImpact,
          created_at: r.createdAt,
        });
      });

      history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return history;
    } catch (err) {
      console.warn('[Store] MongoDB getUserHistory error:', err.message);
    }
  }

  // In-memory history aggregation
  memory.items
    .filter((i) => String(i.userId) === uid && i.status === 'SOLD')
    .forEach((i) => {
      history.push({
        id: `resale-${i.id}`,
        type: 'RESALE',
        description: i.description,
        category: i.category,
        condition: i.condition,
        status: i.status,
        final_price: i.final_price,
        buyer_email: i.buyer_email,
        created_at: i.createdAt,
      });
    });

  memory.repairRequests
    .filter((r) => String(r.userId) === uid)
    .forEach((r) => {
      history.push({
        id: `repair-${r.id}`,
        type: 'REPAIR',
        description: r.description,
        category: r.category,
        condition: r.condition,
        status: r.status,
        worker_notes: r.workerNotes || null,
        estimated_completion: r.updatedAt,
        created_at: r.createdAt,
      });
    });

  memory.recycleRequests
    .filter((r) => String(r.userId) === uid)
    .forEach((r) => {
      history.push({
        id: `recycle-${r.id}`,
        type: 'RECYCLE',
        description: r.description,
        category: r.category,
        condition: r.condition,
        status: r.status,
        recycling_center: r.recyclingCenter || null,
        environmental_impact: r.environmentalImpact || null,
        created_at: r.createdAt,
      });
    });

  history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return history;
}

export { memory };
