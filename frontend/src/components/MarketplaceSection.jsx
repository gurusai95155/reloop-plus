import { useState, useEffect } from 'react';
import { API } from '../config.js';

export default function MarketplaceSection({ user, refreshKey, onBidPlaced }) {
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('browse');
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidAmounts, setBidAmounts] = useState({});

  useEffect(() => {
    if (user?.email && user?.token) {
      setUserLoading(false);
      loadMarketplaceData();
    } else {
      setUserLoading(true);
    }
  }, [refreshKey, user]);

  async function loadMarketplaceData() {
    try {
    // Only show full-screen loading on first load to prevent glitchy flash every 5s
      if (!initialLoadDone) setLoading(true);
      setError('');
      
      // Load marketplace items (excluding user's own items)
      const marketplaceRes = await fetch(`${API}/resale/marketplace`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const marketplaceData = await marketplaceRes.json();
      if (marketplaceRes.ok) {
        setMarketplaceItems(Array.isArray(marketplaceData) ? marketplaceData : []);
      } else {
        setError(marketplaceData?.error || 'Failed to load marketplace. Try logging in again.');
      }

      // Load user's items with bids (backend uses Authorization to get userId)
      const myItemsRes = await fetch(`${API}/resale/my-items`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const myItemsData = await myItemsRes.json();
      if (myItemsRes.ok) {
        setMyItems(Array.isArray(myItemsData) ? myItemsData : []);
      } else if (marketplaceRes.ok) {
        setError(myItemsData?.error || 'Failed to load my items');
      }

      // Load user's bids
      const myBidsRes = await fetch(`${API}/resale/my-bids`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const myBidsData = await myBidsRes.json();
      if (myBidsRes.ok) {
        setMyBids(Array.isArray(myBidsData) ? myBidsData : []);
      } else if (marketplaceRes.ok && myItemsRes.ok) {
        setError(myBidsData?.error || 'Failed to load bids');
      }
    } catch (err) {
      setError('Failed to load marketplace data');
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }

  async function placeBid(itemId) {
    const amount = bidAmounts[itemId];
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    try {
      const res = await fetch(`${API}/resale/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          itemId,
          amount: parseFloat(amount),
          bidderEmail: user?.email || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to place bid');
        return;
      }

      setBidAmounts(prev => ({ ...prev, [itemId]: '' }));
      setError('');
      onBidPlaced?.();
      loadMarketplaceData();
    } catch (err) {
      setError('Network error');
    }
  }

  async function acceptBid(itemId, bidId) {
    try {
      const res = await fetch(`${API}/resale/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ itemId, bidId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to accept bid');
        return;
      }
      setError('');
      onBidPlaced?.();
      loadMarketplaceData();
    } catch (err) {
      setError('Network error');
    }
  }

  async function rejectBid(itemId, bidId) {
    try {
      const res = await fetch(`${API}/resale/reject-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ itemId, bidId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reject bid');
        return;
      }
      setError('');
      onBidPlaced?.();
      loadMarketplaceData();
    } catch (err) {
      setError('Network error');
    }
  }

  function getStatusBadge(status) {
    const statusClasses = {
      'PENDING': 'status-pending',
      'ACCEPTED': 'status-accepted',
      'REJECTED': 'status-rejected',
      'SOLD': 'status-sold'
    };
    return `status-badge ${statusClasses[status] || 'status-pending'}`;
  }

  function isItemOwner(item) {
    // Enhanced null safety with optional chaining
    return user?.email?.toLowerCase() === item?.owner_email?.toLowerCase();
  }

  if (userLoading || (loading && !initialLoadDone)) {
    return (
      <div className="section marketplace-section">
        <h2>🛒 Items on Resale</h2>
        <div className="loading" style={{ minHeight: '200px' }}>
          {userLoading ? 'Loading user information...' : 'Loading marketplace...'}
        </div>
      </div>
    );
  }

  if (!user?.email || !user?.token) {
    return (
      <div className="section marketplace-section">
        <h2>🛒 Items on Resale</h2>
        <div className="error-message">
          User authentication required. Please log in again.
        </div>
      </div>
    );
  }

  return (
    <div className="section marketplace-section">
      <h2>🛒 Items on Resale</h2>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Sub-tabs */}
      <div className="marketplace-tabs">
        <button 
          className={`sub-tab ${activeSubTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('browse')}
        >
          Browse Marketplace ({marketplaceItems.length})
        </button>
        <button 
          className={`sub-tab ${activeSubTab === 'my-items' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('my-items')}
        >
          My Items ({myItems.length})
        </button>
        <button 
          className={`sub-tab ${activeSubTab === 'my-bids' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('my-bids')}
        >
          My Bids ({myBids.length})
        </button>
      </div>

      {/* Browse Marketplace */}
      {activeSubTab === 'browse' && (
        <div className="marketplace-grid">
          {marketplaceItems.length === 0 ? (
            <div className="empty-state">No items available in the marketplace</div>
          ) : (
            marketplaceItems.map(item => (
              <div key={item.id} className="marketplace-item-card">
                <div className="item-header">
                  <h3>{item.description}</h3>
                  <span className={getStatusBadge(item.status)}>{item.status}</span>
                </div>
                <div className="item-details">
                  <p className="item-meta">
                    {item.category && <span className="category">{item.category}</span>}
                    {item.condition && <span className="condition">{item.condition}</span>}
                  </p>
                  <p className="seller-info">Seller: {item.owner_email}</p>
                </div>
                
                {/* Bids Section */}
                <div className="bids-section">
                  <h4>Current Bids</h4>
                  {item.bids && item.bids.length > 0 ? (
                    <div className="bids-list">
                      {item.bids.map(bid => (
                        <div key={bid.id} className="bid-item">
                          <span className="bidder">{bid.bidder_email}</span>
                          <span className="bid-amount">${bid.amount}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-bids">No bids yet</p>
                  )}
                </div>

                {/* Place Bid or Owner Notice */}
                <div className="place-bid">
                  {isItemOwner(item) ? (
                    <div className="owner-notice">
                      <span className="owner-label">🏠 You listed this item</span>
                    </div>
                  ) : (
                    <div className="bid-input-group">
                      <input
                        type="number"
                        placeholder="Enter bid amount"
                        value={bidAmounts[item.id] || ''}
                        onChange={(e) => setBidAmounts(prev => ({ 
                          ...prev, 
                          [item.id]: e.target.value 
                        }))}
                        step="0.01"
                        min="0"
                      />
                      <button 
                        onClick={() => placeBid(item.id)}
                        className="bid-button"
                      >
                        Place Bid
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Items - Sell to other users */}
      {activeSubTab === 'my-items' && (
        <div className="my-items-grid">
          {myItems.length === 0 ? (
            <div className="empty-state">You haven't listed any items for resale</div>
          ) : (
            myItems.map(item => {
              const pendingBids = (item.bids || []).filter(b => b.status === 'PENDING');
              const highestBid = pendingBids.length > 0
                ? pendingBids.reduce((best, b) => (b.amount > (best?.amount ?? 0) ? b : best), null)
                : null;
              return (
                <div key={item.id} className="my-item-card">
                  <div className="item-header">
                    <h3>{item.description}</h3>
                    <span className={getStatusBadge(item.status)}>{item.status}</span>
                  </div>

                  {/* Sell option – shown when someone has placed a bid */}
                  {item.status === 'LISTED' && (
                    <div className={`sell-to-users-block ${pendingBids.length > 0 ? 'sell-has-bids' : ''}`}>
                      <h4 className="sell-heading">Sell to other users</h4>
                      {pendingBids.length > 0 ? (
                        <>
                          <p className="sell-bid-alert">
                            {pendingBids.length === 1
                              ? 'Someone placed a bid on this item – you can sell now.'
                              : `${pendingBids.length} users have placed bids – accept an offer to sell.`}
                          </p>
                          <div className="sell-actions">
                            {highestBid && (
                              <>
                                <button
                                  type="button"
                                  className="sell-button-primary"
                                  onClick={() => acceptBid(item.id, highestBid.id)}
                                >
                                  Sell now – ${highestBid.amount} (highest bid)
                                </button>
                                <span className="sell-detail">
                                  Sell to {highestBid.bidder_email || 'bidder'} at ${highestBid.amount}
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="sell-waiting">Listed for sale. Waiting for offers from other users.</p>
                      )}
                    </div>
                  )}
                  {item.status === 'SOLD' && (
                    <div className="sell-to-users-block sold-note">
                      <p className="sell-desc">Sold. See Past History for details.</p>
                    </div>
                  )}

                  {/* Bids on this item */}
                  <div className="bids-section">
                    <h4>Bids on this item</h4>
                    {item.bids && item.bids.length > 0 ? (
                      <div className="bids-list">
                        {item.bids.map(bid => (
                          <div key={bid.id} className="bid-item">
                            <div className="bid-info">
                              <span className="bidder">{bid.bidder_email}</span>
                              <span className="bid-amount">${bid.amount}</span>
                              <span className={getStatusBadge(bid.status)}>{bid.status}</span>
                            </div>
                            {bid.status === 'PENDING' && (
                              <div className="bid-actions">
                                <button
                                  onClick={() => acceptBid(item.id, bid.id)}
                                  className="accept-button"
                                >
                                  Accept & Sell
                                </button>
                                <button
                                  type="button"
                                  className="reject-bid-button"
                                  onClick={() => rejectBid(item.id, bid.id)}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-bids">No bids yet</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* My Bids */}
      {activeSubTab === 'my-bids' && (
        <div className="my-bids-grid">
          {myBids.length === 0 ? (
            <div className="empty-state">You haven't placed any bids</div>
          ) : (
            myBids.map(bid => (
              <div key={bid.id} className="my-bid-card">
                <div className="bid-header">
                  <h3>{bid.item_description}</h3>
                  <span className={getStatusBadge(bid.status)}>{bid.status}</span>
                </div>
                <div className="bid-details">
                  <p className="bid-amount">Your bid: ${bid.amount}</p>
                  <p className="seller-info">Seller: {bid.seller_email}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
