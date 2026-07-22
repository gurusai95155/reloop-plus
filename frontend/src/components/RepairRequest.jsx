import { useState } from 'react';

const API = '/api';

export default function RepairRequest({ user, item, aiResult, onDone }) {
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');

  async function submitRepair() {
    setError('');
    try {
      const res = await fetch(`${API}/repair/requests`, {
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
      setCreated(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!created) {
    return (
      <div className="repair-request">
        <h2>Repair request</h2>
        <p className="item-desc">{item?.description}</p>
        <p className="muted">A nearby repair worker (mocked) will see this job and can accept. Status updates are simulated.</p>
        {error && <p className="error">{error}</p>}
        <button type="button" onClick={submitRepair}>Submit repair request</button>
        <button type="button" className="link-button" onClick={onDone}>Back to dashboard</button>
      </div>
    );
  }

  const statusLabels = { PENDING: 'Pending', ACCEPTED: 'Accepted', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };

  return (
    <div className="repair-request">
      <h2>Repair request submitted</h2>
      <p className="item-desc">{created.description}</p>
      <p className="status-block">
        <strong>Status:</strong> <span className="status">{statusLabels[created.status] || created.status}</span>
      </p>
      <p className="muted">Workers see this in the Worker dashboard. No real travel or payments.</p>
      <button type="button" className="link-button" onClick={onDone}>Back to dashboard</button>
    </div>
  );
}
