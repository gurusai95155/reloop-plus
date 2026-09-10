import { Router } from 'express';
import {
  getListedResaleItems,
  getResaleItemById,
  createResaleItem,
  addBid,
  acceptBid,
  rejectBid,
  getSellerItemsWithBids,
  getMarketplaceItems,
  getMyBidsWithItemDetails,
  memory,
} from '../db/store.js';

const router = Router();

// Token format: mock-{userId}-{timestamp}; always return string for consistent comparison
function getUserIdFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const parts = token.split('-');
  const id = parts.length >= 2 ? parts[1] : null;
  return id != null ? String(id) : null;
}

router.get('/items', async (req, res) => {
  try {
    const items = await getListedResaleItems();
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.post('/items', async (req, res) => {
  const { userId, userEmail, description, category, condition, age, aiDecision } = req.body || {};
  if (!userId || !description) {
    return res.status(400).json({ error: 'userId and description required' });
  }
  try {
    const item = await createResaleItem({
      userId,
      userEmail,
      description,
      category,
      condition,
      age,
      aiDecision,
    });
    res.status(201).json(item);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.get('/items/:id', async (req, res) => {
  try {
    const item = await getResaleItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

router.post('/items/:id/bids', async (req, res) => {
  const { bidderId, bidderEmail, amount } = req.body || {};
  if (!bidderId || amount == null) return res.status(400).json({ error: 'bidderId and amount required' });

  try {
    const item = await getResaleItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'LISTED') return res.status(400).json({ error: 'Item not accepting bids' });

    const bid = await addBid({
      itemId: req.params.id,
      bidderId,
      bidderEmail,
      amount,
    });
    res.status(201).json(bid);
  } catch (err) {
    console.error('Error adding bid:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

router.post('/items/:id/bids/:bidId/accept', async (req, res) => {
  try {
    const result = await acceptBid({
      itemId: req.params.id,
      bidId: req.params.bidId,
      ownerUserId: req.body?.userId,
    });
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error('Error accepting bid:', err);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

router.post('/items/:id/bids/:bidId/reject', async (req, res) => {
  try {
    const result = await rejectBid({
      itemId: req.params.id,
      bidId: req.params.bidId,
      ownerUserId: req.body?.userId,
    });
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json(result.bid);
  } catch (err) {
    console.error('Error rejecting bid:', err);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
});

router.get('/my-items', async (req, res) => {
  const userId = getUserIdFromAuth(req) || req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const items = await getSellerItemsWithBids(userId);
    res.json(items);
  } catch (err) {
    console.error('Error fetching seller items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Marketplace: list all LISTED items excluding current user's own items
router.get('/marketplace', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Invalid token' });

  try {
    const items = await getMarketplaceItems(userId);
    res.json(items);
  } catch (err) {
    console.error('Error fetching marketplace:', err);
    res.status(500).json({ error: 'Failed to fetch marketplace' });
  }
});

// Place bid (requires Authorization)
router.post('/bid', async (req, res) => {
  const { itemId, amount, bidderEmail: bodyEmail } = req.body || {};
  const bidderId = getUserIdFromAuth(req);
  if (!bidderId) return res.status(401).json({ error: 'Authorization required' });
  const bidderEmail = bodyEmail || `user${bidderId}@example.com`;

  try {
    const item = await getResaleItemById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'LISTED') return res.status(400).json({ error: 'Item not accepting bids' });
    if (
      String(item.userId) === bidderId ||
      (item.userEmail && item.userEmail.toLowerCase() === String(bidderEmail).toLowerCase())
    ) {
      return res.status(400).json({ error: 'Owners cannot bid on their own items.' });
    }
    if (amount == null || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    const bid = await addBid({
      itemId,
      bidderId,
      bidderEmail,
      amount,
    });
    res.status(201).json(bid);
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Accept bid (seller only)
router.post('/accept-bid', async (req, res) => {
  const { itemId, bidId } = req.body || {};
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authorization required' });

  try {
    const result = await acceptBid({
      itemId,
      bidId,
      ownerUserId: userId,
    });
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error('Error accepting bid:', err);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// Reject bid (seller only)
router.post('/reject-bid', async (req, res) => {
  const { itemId, bidId } = req.body || {};
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: 'Authorization required' });

  try {
    const result = await rejectBid({
      itemId,
      bidId,
      ownerUserId: userId,
    });
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json(result.bid);
  } catch (err) {
    console.error('Error rejecting bid:', err);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
});

// My bids (bids placed by current user)
router.get('/my-bids', async (req, res) => {
  const bidderId = getUserIdFromAuth(req);
  if (!bidderId) return res.status(401).json({ error: 'Authorization required' });

  try {
    const bidsWithDetails = await getMyBidsWithItemDetails(bidderId);
    res.json(bidsWithDetails);
  } catch (err) {
    console.error('Error fetching my bids:', err);
    res.status(500).json({ error: 'Failed to fetch user bids' });
  }
});

export default router;
export { memory };
