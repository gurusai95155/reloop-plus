import pg from 'pg';

const { Pool } = pg;
let isPostgres = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('...'));

let pool = null;
if (isPostgres) {
  const sslOption = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslOption,
  });
  pool.on('error', (err) => {
    console.error('PostgreSQL unexpected pool error:', err.message);
    isPostgres = false;
  });
}

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
    { id: '2', userId: '2', userEmail: 'seller2@example.com', description: 'Gently used bicycle', category: 'Sports', condition: 'Like new', age: '1 year', aiDecision: 'RESALE', status: 'LISTED', createdAt: now },
    { id: '3', userId: '3', userEmail: 'seller3@example.com', description: 'Coffee maker', category: 'Electronics', condition: 'Good', age: '2 years', aiDecision: 'RESALE', status: 'LISTED', createdAt: now },
    { id: '4', userId: '2', userEmail: 'seller2@example.com', description: 'Bookshelf', category: 'Furniture', condition: 'Fair', age: null, aiDecision: 'RESALE', status: 'LISTED', createdAt: now }
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
    workerId: 'w1',
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
    workerId: 'w1',
    workerEmail: 'worker@example.com',
    recyclingCenter: 'E-Waste Center',
    environmentalImpact: 'Materials recovered',
    createdAt: now,
    updatedAt: now,
  });
  memory.nextRecycleId = 2;
}
seedMemory();

// ----------------------------------------------------
// Database Initialization (PostgreSQL)
// ----------------------------------------------------
export async function initDb() {
  if (!isPostgres) {
    console.log('[Store] Running with in-memory store (active).');
    return;
  }
  console.log('[Store] Connecting to PostgreSQL...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'USER',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS resale_items (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_email VARCHAR(255),
        description TEXT NOT NULL,
        category VARCHAR(100),
        condition VARCHAR(50),
        age VARCHAR(50),
        ai_decision VARCHAR(50),
        status VARCHAR(50) DEFAULT 'LISTED',
        final_price NUMERIC,
        buyer_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(50) NOT NULL,
        bidder_id VARCHAR(50) NOT NULL,
        bidder_email VARCHAR(255),
        amount NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS repair_requests (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_email VARCHAR(255),
        description TEXT NOT NULL,
        category VARCHAR(100),
        condition VARCHAR(50),
        age VARCHAR(50),
        ai_decision VARCHAR(50),
        status VARCHAR(50) DEFAULT 'PENDING',
        worker_id VARCHAR(50),
        worker_email VARCHAR(255),
        worker_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS recycle_requests (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_email VARCHAR(255),
        description TEXT NOT NULL,
        category VARCHAR(100),
        condition VARCHAR(50),
        age VARCHAR(50),
        ai_decision VARCHAR(50),
        choice VARCHAR(50) DEFAULT 'RESPONSIBLE',
        status VARCHAR(50) DEFAULT 'PENDING',
        worker_id VARCHAR(50),
        worker_email VARCHAR(255),
        recycling_center VARCHAR(255),
        environmental_impact VARCHAR(255),
        estimated_value NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Store] PostgreSQL schema verified successfully.');
  } catch (err) {
    console.warn(`[Store] PostgreSQL connection failed (${err.message}). Seamlessly falling back to in-memory store.`);
    isPostgres = false;
  }
}

// ----------------------------------------------------
// Unified Store Methods: Users & Auth
// ----------------------------------------------------
export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [normalized]);
      return res.rows[0] ? {
        id: String(res.rows[0].id),
        email: res.rows[0].email,
        password: res.rows[0].password,
        role: res.rows[0].role,
      } : null;
    } catch (err) {
      console.warn('[Store] Postgres error in findUserByEmail, falling back to memory:', err.message);
      isPostgres = false;
    }
  }
  return memory.users.get(normalized) || null;
}

export async function createUser({ email, password, role }) {
  const normalized = String(email).trim().toLowerCase();
  if (isPostgres) {
    try {
      const res = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [normalized, password, role]
      );
      return {
        id: String(res.rows[0].id),
        email: res.rows[0].email,
        role: res.rows[0].role,
      };
    } catch (err) {
      console.warn('[Store] Postgres error in createUser, falling back to memory:', err.message);
      isPostgres = false;
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
  if (isPostgres) {
    const res = await pool.query(
      `SELECT id, user_id as "userId", user_email as "userEmail", description, category,
              condition, age, ai_decision as "aiDecision", status, final_price, buyer_email, created_at as "createdAt"
       FROM resale_items WHERE status = 'LISTED' ORDER BY created_at DESC`
    );
    return res.rows.map((r) => ({ ...r, id: String(r.id), userId: String(r.userId) }));
  }
  return memory.items.filter((i) => i.status === 'LISTED');
}

export async function getResaleItemById(id) {
  const itemIdStr = String(id);
  if (isPostgres) {
    const itemRes = await pool.query(
      `SELECT id, user_id as "userId", user_email as "userEmail", description, category,
              condition, age, ai_decision as "aiDecision", status, final_price, buyer_email, created_at as "createdAt"
       FROM resale_items WHERE id = $1 LIMIT 1`,
      [Number(id)]
    );
    if (!itemRes.rows[0]) return null;
    const item = { ...itemRes.rows[0], id: String(itemRes.rows[0].id), userId: String(itemRes.rows[0].userId) };
    const bidsRes = await pool.query(
      `SELECT id, item_id as "itemId", bidder_id as "bidderId", bidder_email as "bidderEmail",
              amount, status, created_at as "createdAt"
       FROM bids WHERE item_id = $1 ORDER BY created_at ASC`,
      [itemIdStr]
    );
    item.bids = bidsRes.rows.map((b) => ({ ...b, id: String(b.id), amount: Number(b.amount) }));
    return item;
  }

  const item = memory.items.find((i) => String(i.id) === itemIdStr);
  if (!item) return null;
  const itemBids = memory.bids.filter((b) => String(b.itemId) === itemIdStr);
  return { ...item, bids: itemBids };
}

export async function createResaleItem({ userId, userEmail, description, category, condition, age, aiDecision }) {
  if (isPostgres) {
    const res = await pool.query(
      `INSERT INTO resale_items (user_id, user_email, description, category, condition, age, ai_decision, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'LISTED')
       RETURNING id, user_id as "userId", user_email as "userEmail", description, category,
                 condition, age, ai_decision as "aiDecision", status, created_at as "createdAt"`,
      [String(userId), userEmail || '', description, category || null, condition || null, age || null, aiDecision || null]
    );
    return { ...res.rows[0], id: String(res.rows[0].id) };
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
  if (isPostgres) {
    const res = await pool.query(
      `INSERT INTO bids (item_id, bidder_id, bidder_email, amount, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id, item_id as "itemId", bidder_id as "bidderId", bidder_email as "bidderEmail", amount, status, created_at as "createdAt"`,
      [itemIdStr, String(bidderId), bidderEmail || '', Number(amount) || 0]
    );
    return { ...res.rows[0], id: String(res.rows[0].id), amount: Number(res.rows[0].amount) };
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

  if (isPostgres) {
    const item = await getResaleItemById(itemIdStr);
    if (!item) return { error: 'Item not found', status: 404 };
    if (String(item.userId) !== String(ownerUserId)) return { error: 'Only owner can accept', status: 403 };
    const bid = item.bids?.find((b) => String(b.id) === bidIdStr);
    if (!bid) return { error: 'Bid not found', status: 404 };
    if (bid.status !== 'PENDING') return { error: 'Bid already resolved', status: 400 };

    await pool.query("UPDATE bids SET status = 'ACCEPTED' WHERE id = $1", [Number(bidId)]);
    await pool.query("UPDATE bids SET status = 'REJECTED' WHERE item_id = $1 AND id != $2", [itemIdStr, Number(bidId)]);
    await pool.query("UPDATE resale_items SET status = 'SOLD', final_price = $1, buyer_email = $2 WHERE id = $3", [
      bid.amount,
      bid.bidderEmail || '',
      Number(itemId),
    ]);

    const updated = await getResaleItemById(itemIdStr);
    return { item: updated, bid: { ...bid, status: 'ACCEPTED' } };
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

  if (isPostgres) {
    const item = await getResaleItemById(itemIdStr);
    if (!item) return { error: 'Item not found', status: 404 };
    if (String(item.userId) !== String(ownerUserId)) return { error: 'Only owner can reject', status: 403 };
    const res = await pool.query(
      "UPDATE bids SET status = 'REJECTED' WHERE id = $1 AND item_id = $2 RETURNING id, item_id as \"itemId\", status",
      [Number(bidId), itemIdStr]
    );
    if (!res.rows[0]) return { error: 'Bid not found', status: 404 };
    return { bid: { ...res.rows[0], id: String(res.rows[0].id) } };
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
  if (isPostgres) {
    const itemsRes = await pool.query(
      `SELECT id, user_id as "userId", user_email as "userEmail", description, category,
              condition, age, ai_decision as "aiDecision", status, final_price, buyer_email, created_at as "createdAt"
       FROM resale_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [uid]
    );
    const result = [];
    for (const row of itemsRes.rows) {
      const bidsRes = await pool.query(
        `SELECT id, item_id as "itemId", bidder_id as "bidderId", bidder_email as "bidderEmail",
                amount, status, created_at as "createdAt"
         FROM bids WHERE item_id = $1 ORDER BY amount DESC`,
        [String(row.id)]
      );
      result.push({
        ...row,
        id: String(row.id),
        userId: String(row.userId),
        bids: bidsRes.rows.map((b) => ({ ...b, id: String(b.id), amount: Number(b.amount) })),
      });
    }
    return result;
  }

  const userItems = memory.items.filter((i) => String(i.userId) === uid);
  return userItems.map((item) => {
    const itemBids = memory.bids.filter((b) => String(b.itemId) === String(item.id));
    return { ...item, bids: itemBids };
  });
}

export async function getMarketplaceItems(excludeUserId) {
  const excludeIdStr = excludeUserId != null ? String(excludeUserId) : null;
  if (isPostgres) {
    let query = `SELECT id, user_id as "userId", user_email as "userEmail", description, category,
                        condition, age, ai_decision as "aiDecision", status, final_price, buyer_email, created_at as "createdAt"
                 FROM resale_items WHERE status = 'LISTED'`;
    const params = [];
    if (excludeIdStr) {
      params.push(excludeIdStr);
      query += ` AND user_id != $1`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await pool.query(query, params);
    const result = [];
    for (const row of res.rows) {
      const bidsRes = await pool.query(
        `SELECT id, item_id as "itemId", bidder_id as "bidderId", bidder_email as "bidderEmail",
                amount, status, created_at as "createdAt"
         FROM bids WHERE item_id = $1 ORDER BY amount DESC`,
        [String(row.id)]
      );
      result.push({
        ...row,
        id: String(row.id),
        userId: String(row.userId),
        owner_email: row.userEmail,
        bids: bidsRes.rows.map((b) => ({ ...b, id: String(b.id), amount: Number(b.amount), bidder_email: b.bidderEmail })),
      });
    }
    return result;
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
  if (isPostgres) {
    const res = await pool.query(
      `SELECT b.id, b.item_id as "itemId", b.bidder_id as "bidderId", b.bidder_email as "bidderEmail",
              b.amount, b.status, b.created_at as "createdAt",
              i.description as item_description, i.user_email as seller_email
       FROM bids b
       LEFT JOIN resale_items i ON b.item_id = CAST(i.id AS VARCHAR)
       WHERE b.bidder_id = $1
       ORDER BY b.created_at DESC`,
      [bidIdStr]
    );
    return res.rows.map((r) => ({
      ...r,
      id: String(r.id),
      amount: Number(r.amount),
      bidder_email: r.bidderEmail,
      item_description: r.item_description || 'Unknown item',
      seller_email: r.seller_email || 'Unknown seller',
    }));
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
  if (isPostgres) {
    let query = `SELECT id, user_id as "userId", user_email as "userEmail", description, category,
                        condition, age, ai_decision as "aiDecision", status, worker_id as "workerId",
                        worker_email as "workerEmail", worker_notes as "workerNotes",
                        created_at as "createdAt", updated_at as "updatedAt"
                 FROM repair_requests WHERE 1=1`;
    const params = [];
    if (userId) {
      params.push(String(userId));
      query += ` AND user_id = $${params.length}`;
    }
    if (workerId) {
      params.push(String(workerId));
      query += ` AND worker_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await pool.query(query, params);
    return res.rows.map((r) => ({ ...r, id: String(r.id) }));
  }

  let list = [...memory.repairRequests];
  if (userId) list = list.filter((r) => String(r.userId) === String(userId));
  if (workerId) list = list.filter((r) => String(r.workerId) === String(workerId));
  if (status) list = list.filter((r) => r.status === status);
  return list;
}

export async function createRepairRequest(data) {
  const now = new Date().toISOString();
  if (isPostgres) {
    const res = await pool.query(
      `INSERT INTO repair_requests (user_id, user_email, description, category, condition, age, ai_decision, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING id, user_id as "userId", user_email as "userEmail", description, category,
                 condition, age, ai_decision as "aiDecision", status, created_at as "createdAt", updated_at as "updatedAt"`,
      [String(data.userId), data.userEmail || '', data.description, data.category || null, data.condition || null, data.age || null, data.aiDecision || null]
    );
    return { ...res.rows[0], id: String(res.rows[0].id) };
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
  if (isPostgres) {
    const res = await pool.query(
      `UPDATE repair_requests
       SET status = 'ACCEPTED', worker_id = $1, worker_email = $2, updated_at = NOW()
       WHERE id = $3 AND status = 'PENDING'
       RETURNING id, user_id as "userId", user_email as "userEmail", description, category,
                 condition, age, ai_decision as "aiDecision", status, worker_id as "workerId",
                 worker_email as "workerEmail", updated_at as "updatedAt"`,
      [String(workerId), workerEmail || '', Number(id)]
    );
    return res.rows[0] ? { ...res.rows[0], id: String(res.rows[0].id) } : null;
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
  if (isPostgres) {
    const res = await pool.query(
      `UPDATE repair_requests SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, user_id as "userId", user_email as "userEmail", description, category,
                 condition, age, ai_decision as "aiDecision", status, worker_id as "workerId",
                 worker_email as "workerEmail", updated_at as "updatedAt"`,
      [status, Number(id)]
    );
    return res.rows[0] ? { ...res.rows[0], id: String(res.rows[0].id) } : null;
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
  if (isPostgres) {
    let query = `SELECT id, user_id as "userId", user_email as "userEmail", description, category,
                        condition, age, ai_decision as "aiDecision", choice, status, worker_id as "workerId",
                        worker_email as "workerEmail", recycling_center as "recyclingCenter",
                        environmental_impact as "environmentalImpact", estimated_value as "estimatedValue",
                        created_at as "createdAt", updated_at as "updatedAt"
                 FROM recycle_requests WHERE 1=1`;
    const params = [];
    if (userId) {
      params.push(String(userId));
      query += ` AND user_id = $${params.length}`;
    }
    if (workerId) {
      params.push(String(workerId));
      query += ` AND worker_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const res = await pool.query(query, params);
    return res.rows.map((r) => ({ ...r, id: String(r.id), estimatedValue: r.estimatedValue ? Number(r.estimatedValue) : null }));
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

  if (isPostgres) {
    const res = await pool.query(
      `INSERT INTO recycle_requests (user_id, user_email, description, category, condition, age, ai_decision, choice, estimated_value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
       RETURNING id, user_id as "userId", user_email as "userEmail", description, category,
                 condition, age, ai_decision as "aiDecision", choice, estimated_value as "estimatedValue",
                 status, created_at as "createdAt", updated_at as "updatedAt"`,
      [String(data.userId), data.userEmail || '', data.description, data.category || null, data.condition || null, data.age || null, data.aiDecision || null, choice, estimatedValue]
    );
    return { ...res.rows[0], id: String(res.rows[0].id), estimatedValue: res.rows[0].estimatedValue ? Number(res.rows[0].estimatedValue) : null };
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
  if (isPostgres) {
    const res = await pool.query(
      `UPDATE recycle_requests
       SET status = 'ACCEPTED', worker_id = $1, worker_email = $2, updated_at = NOW()
       WHERE id = $3 AND status = 'PENDING'
       RETURNING id, user_id as "userId", user_email as "userEmail", description, category,
                 condition, age, ai_decision as "aiDecision", status, worker_id as "workerId",
                 worker_email as "workerEmail", updated_at as "updatedAt"`,
      [String(workerId), workerEmail || '', Number(id)]
    );
    return res.rows[0] ? { ...res.rows[0], id: String(res.rows[0].id) } : null;
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
  if (isPostgres) {
    const res = await pool.query(
      `UPDATE recycle_requests SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, user_id as "userId", user_email as "userEmail", description, category,
                 condition, age, ai_decision as "aiDecision", status, worker_id as "workerId",
                 worker_email as "workerEmail", updated_at as "updatedAt"`,
      [status, Number(id)]
    );
    return res.rows[0] ? { ...res.rows[0], id: String(res.rows[0].id) } : null;
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

  if (isPostgres) {
    const soldRes = await pool.query(
      `SELECT id, description, category, condition, status, final_price, buyer_email, created_at
       FROM resale_items WHERE user_id = $1 AND status = 'SOLD'`,
      [uid]
    );
    soldRes.rows.forEach((r) => {
      history.push({
        id: `resale-${r.id}`,
        type: 'RESALE',
        description: r.description,
        category: r.category,
        condition: r.condition,
        status: r.status,
        final_price: r.final_price ? Number(r.final_price) : null,
        buyer_email: r.buyer_email,
        created_at: r.created_at,
      });
    });

    const repairRes = await pool.query(
      `SELECT id, description, category, condition, status, worker_notes, updated_at, created_at
       FROM repair_requests WHERE user_id = $1`,
      [uid]
    );
    repairRes.rows.forEach((r) => {
      history.push({
        id: `repair-${r.id}`,
        type: 'REPAIR',
        description: r.description,
        category: r.category,
        condition: r.condition,
        status: r.status,
        worker_notes: r.worker_notes,
        estimated_completion: r.updated_at,
        created_at: r.created_at,
      });
    });

    const recycleRes = await pool.query(
      `SELECT id, description, category, condition, status, recycling_center, environmental_impact, created_at
       FROM recycle_requests WHERE user_id = $1`,
      [uid]
    );
    recycleRes.rows.forEach((r) => {
      history.push({
        id: `recycle-${r.id}`,
        type: 'RECYCLE',
        description: r.description,
        category: r.category,
        condition: r.condition,
        status: r.status,
        recycling_center: r.recycling_center,
        environmental_impact: r.environmental_impact,
        created_at: r.created_at,
      });
    });
  } else {
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
  }

  history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return history;
}

export { memory };
