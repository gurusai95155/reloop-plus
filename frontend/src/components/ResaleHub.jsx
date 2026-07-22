import { useState } from 'react';

const API = '/api';

export default function ResaleHub({ user, item, aiResult, onDone }) {
  const [listed, setListed] = useState(null);
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');

  async function listItem() {
    setListError('');
    try {
      const res = await fetch(`${API}/resale/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          description: item?.description,
          category: item?.category,
          condition: item?.condition,
          age: item?.age,
          aiDecision: aiResult,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setListed(data);
      setMessage('Item listed. Go to Items on Resale to manage bids.');
    } catch (err) {
      setListError(err.message);
    }
  }

  if (!listed) {
    return (
      <div className="resale-hub">
        <h2>Resale – List your item</h2>
        <p className="item-desc">{item?.description}</p>
        {listError && <p className="error">{listError}</p>}
        <button type="button" onClick={listItem}>List on Resale Hub</button>
        <button type="button" className="link-button" onClick={onDone}>Back to dashboard</button>
      </div>
    );
  }

  return (
    <div className="resale-hub">
      <h2>Resale – Item listed</h2>
      {message && <p className="message">{message}</p>}
      <p className="item-desc">Your item is now on the marketplace. Go to <strong>Items on Resale</strong> to manage bids and accept offers.</p>
      <button type="button" className="link-button" onClick={onDone}>Back to dashboard</button>
    </div>
  );
}
