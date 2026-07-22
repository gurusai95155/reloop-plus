import { Router } from 'express';

const router = Router();
const items = [];
const bids = [];
let itemId = 1;
let bidId = 1;

// Seed data so marketplace and history show items (first user gets id "1")
function seedResaleData() {
  if (items.length > 0) return;
  const now = new Date().toISOString();
  // Items from "other" users (2, 3) for marketplace browse; one SOLD for user "1" in history
  items.push(
    { id: '1', userId: '1', userEmail: 'user@example.com', description: 'Vintage wooden chair', category: 'Furniture', condition: 'Good', age: '5 years', aiDecision: 'RESALE', status: 'SOLD', createdAt: now, final_price: 25, buyer_email: 'buyer@example.com' },
    { id: '2', userId: '2', userEmail: 'seller2@example.com', description: 'Gently used bicycle', category: 'Sports', condition: 'Like new', age: '1 year', aiDecision: 'RESALE', status: 'LISTED', createdAt: now },
    { id: '3', userId: '3', userEmail: 'seller3@example.com', description: 'Coffee maker', category: 'Electronics', condition: 'Good', age: '2 years', aiDecision: 'RESALE', status: 'LISTED', createdAt: now },
    { id: '4', userId: '2', userEmail: 'seller2@example.com', description: 'Bookshelf', category: 'Furniture', condition: 'Fair', age: null, aiDecision: 'RESALE', status: 'LISTED', createdAt: now }
  );
  itemId = 5;
  bidId = 1;
}
seedResaleData();

// Token format: mock-{userId}-{timestamp}; always return string for consistent comparison
function getUserIdFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const parts = token.split('-');
  const id = parts.length >= 2 ? parts[1] : null;
  return id != null ? String(id) : null;
}

router.get('/items', (req, res) => {
  res.json(items.filter((i) => i.status === 'LISTED'));
});

router.post('/items', (req, res) => {
  const { userId, userEmail, description, category, condition, age, aiDecision } = req.body || {};
  if (!userId || !description) {
    return res.status(400).json({ error: 'userId and description required' });
  }
  const item = {
    id: String(itemId++),
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
  items.push(item);
  res.status(201).json(item);
});

router.get('/items/:id', (req, res) => {
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const itemBids = bids.filter((b) => b.itemId === item.id);
  res.json({ ...item, bids: itemBids });
});

router.post('/items/:id/bids', (req, res) => {
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.status !== 'LISTED') return res.status(400).json({ error: 'Item not accepting bids' });
  const { bidderId, bidderEmail, amount } = req.body || {};
  if (!bidderId || amount == null) return res.status(400).json({ error: 'bidderId and amount required' });
  const bid = {
    id: String(bidId++),
    itemId: item.id,
    bidderId,
    bidderEmail: bidderEmail || '',
    amount: Number(amount) || 0,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  bids.push(bid);
  res.status(201).json(bid);
});

router.post('/items/:id/bids/:bidId/accept', (req, res) => {
  const item = items.find((i) => i.id === req.params.id);
  const bid = bids.find((b) => b.id === req.params.bidId && b.itemId === req.params.id);
  if (!item || !bid) return res.status(404).json({ error: 'Not found' });
  if (item.userId !== req.body?.userId) return res.status(403).json({ error: 'Only owner can accept' });
  if (bid.status !== 'PENDING') return res.status(400).json({ error: 'Bid already resolved' });
  bid.status = 'ACCEPTED';
  bids.filter((b) => b.itemId === item.id && b.id !== bid.id).forEach((b) => (b.status = 'REJECTED'));
  item.status = 'SOLD';
  res.json({ item, bid });
});

router.post('/items/:id/bids/:bidId/reject', (req, res) => {
  const bid = bids.find((b) => b.id === req.params.bidId && b.itemId === req.params.id);
  if (!bid) return res.status(404).json({ error: 'Not found' });
  if (bid.status !== 'PENDING') return res.status(400).json({ error: 'Bid already resolved' });
  bid.status = 'REJECTED';
  res.json(bid);
});

router.get('/my-items', (req, res) => {
  const userId = getUserIdFromAuth(req) || req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const uid = String(userId);
  const myItems = items.filter((i) => String(i.userId) === uid);
  const itemsWithBids = myItems.map(item => ({
    ...item,
    owner_email: item.userEmail,
    bids: bids.filter(b => b.itemId === item.id).map(b => ({
      ...b,
      bidder_email: b.bidderEmail
    }))
  }));
  res.json(itemsWithBids);
});

// Marketplace: list all LISTED items excluding current user's own items
router.get('/marketplace', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Invalid token' });

  const marketplaceItems = items.filter((i) =>
    i.status === 'LISTED' && String(i.userId) !== userId
  );
  const itemsWithBids = marketplaceItems.map(item => ({
    ...item,
    owner_email: item.userEmail,
    bids: bids.filter(b => b.itemId === item.id).map(bid => ({
      ...bid,
      bidder_email: bid.bidderEmail
    }))
  }));
  res.json(itemsWithBids);
});

// Place bid (requires Authorization; optional bidderEmail in body for display)
router.post('/bid', (req, res) => {
  const { itemId, amount, bidderEmail: bodyEmail } = req.body || {};
  const bidderId = getUserIdFromAuth(req);
  if (!bidderId) return res.status(401).json({ error: 'Authorization required' });
  const bidderEmail = bodyEmail || `user${bidderId}@example.com`;

  const item = items.find((i) => String(i.id) === String(itemId));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.status !== 'LISTED') return res.status(400).json({ error: 'Item not accepting bids' });
  if (String(item.userId) === bidderId || (item.userEmail && item.userEmail.toLowerCase() === String(bidderEmail).toLowerCase())) {
    return res.status(400).json({ error: 'Owners cannot bid on their own items.' });
  }
  if (amount == null || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

  const bid = {
    id: String(bidId++),
    itemId: item.id,
    bidderId,
    bidderEmail,
    amount: Number(amount),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  bids.push(bid);
  res.status(201).json(bid);
});

// Accept bid (seller only) – A (owner) can accept B's bid and sell to B
router.post('/accept-bid', (req, res) => {
  const { itemId, bidId: bidIdParam } = req.body || {};
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authorization required' });

  const sid = String(itemId);
  const bidIdStr = bidIdParam != null ? String(bidIdParam) : null;
  const item = items.find((i) => String(i.id) === sid);
  const bid = bids.find((b) => String(b.id) === bidIdStr && String(b.itemId) === sid);
  if (!item || !bid) return res.status(404).json({ error: 'Not found' });

  const ownerId = String(item.userId);
  const requesterId = String(userId);
  if (ownerId !== requesterId) return res.status(403).json({ error: 'Only owner can accept this bid' });
  if (bid.status !== 'PENDING') return res.status(400).json({ error: 'Bid already resolved' });

  bid.status = 'ACCEPTED';
  bids.filter((b) => b.itemId === item.id && b.id !== bid.id).forEach((b) => (b.status = 'REJECTED'));
  item.status = 'SOLD';
  item.final_price = bid.amount;
  item.buyer_email = bid.bidderEmail;

  res.json({ item, bid });
});

// Reject bid (seller only)
router.post('/reject-bid', (req, res) => {
  const { itemId, bidId: bidIdParam } = req.body || {};
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authorization required' });

  const sid = String(itemId);
  const bidIdStr = bidIdParam != null ? String(bidIdParam) : null;
  const item = items.find((i) => String(i.id) === sid);
  const bid = bids.find((b) => String(b.id) === bidIdStr && String(b.itemId) === sid);
  if (!item || !bid) return res.status(404).json({ error: 'Not found' });
  if (String(item.userId) !== String(userId)) return res.status(403).json({ error: 'Only owner can reject' });
  if (bid.status !== 'PENDING') return res.status(400).json({ error: 'Bid already resolved' });

  bid.status = 'REJECTED';
  res.json(bid);
});

// My bids (bids placed by current user)
router.get('/my-bids', (req, res) => {
  const bidderId = getUserIdFromAuth(req);
  if (!bidderId) return res.status(401).json({ error: 'Authorization required' });

  const myBids = bids.filter(b => String(b.bidderId) === bidderId);
  const bidsWithItemDetails = myBids.map(bid => {
    const item = items.find(i => i.id === bid.itemId);
    return {
      ...bid,
      item_description: item?.description || 'Unknown item',
      seller_email: item?.userEmail || 'Unknown seller'
    };
  });
  res.json(bidsWithItemDetails);
});

export default router;
export { items };
