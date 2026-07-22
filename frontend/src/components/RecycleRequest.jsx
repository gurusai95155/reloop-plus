import { useState } from 'react';

const API = '/api';

export default function RecycleRequest({ user, item, aiResult, onDone }) {
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');

  async function submitRecycle() {
    setError('');
    try {
      const res = await fetch(`${API}/recycle/requests`, {
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
          choice: 'RESPONSIBLE', // Default to responsible recycling
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCreated(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!created) {
    return (
      <div className="recycle-request">
        <h2>Recycle request</h2>
        <p className="item-desc">{item?.description}</p>
        <p className="muted">Your item will be processed for responsible recycling. Nearby recyclers (mocked) will see this job.</p>
        {error && <p className="error">{error}</p>}
        <button type="button" onClick={submitRecycle}>
          Submit recycle request
        </button>
        <button type="button" className="link-button" onClick={onDone}>Back to dashboard</button>
      </div>
    );
  }

  const statusLabels = { PENDING: 'Pending', ACCEPTED: 'Accepted', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };

  return (
    <div className="recycle-request">
      <h2>Recycle request submitted</h2>
      <p className="item-desc">{created.description}</p>
      <p className="status-block">
        <strong>Status:</strong> <span className="status">{statusLabels[created.status] || created.status}</span>
      </p>
      {created.choice === 'VALUE' && created.estimatedValue != null && (
        <p className="estimated-value">Estimated value (mock): ${created.estimatedValue}</p>
      )}
      <p className="muted">Recyclers see this in the Worker dashboard. Status is simulated.</p>
      <button type="button" className="link-button" onClick={onDone}>Back to dashboard</button>
    </div>
  );
}
