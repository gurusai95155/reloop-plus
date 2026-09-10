import { useState, useEffect } from 'react';
import { API } from '../config.js';

export default function HistorySection({ user, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.token) loadHistory();
  }, [refreshKey, user?.token]);

  async function loadHistory() {
    if (!user?.token) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API}/user/history`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      
      const data = await res.json();
      if (res.ok) {
        setHistory(data);
      } else {
        setError(data.error || 'Failed to load history');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status) {
    const statusClasses = {
      'PENDING': 'status-pending',
      'IN_PROGRESS': 'status-in-progress',
      'COMPLETED': 'status-completed',
      'ACCEPTED': 'status-accepted',
      'REJECTED': 'status-rejected',
      'SOLD': 'status-sold'
    };
    return `status-badge ${statusClasses[status] || 'status-pending'}`;
  }

  function getTypeIcon(type) {
    const icons = {
      'RESALE': '🛒',
      'REPAIR': '🔧',
      'RECYCLE': '♻️'
    };
    return icons[type] || '📦';
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="section">
        <h2>📋 Past History</h2>
        <div className="loading">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="section">
      <h2>📋 Past History</h2>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No history yet</h3>
          <p>Start submitting items to see your activity history here</p>
        </div>
      ) : (
        <div className="history-grid">
          {history.map(item => (
            <div key={item.id} className="history-item-card">
              <div className="history-header">
                <div className="history-type">
                  <span className="type-icon">{getTypeIcon(item.type)}</span>
                  <span className="type-label">{item.type}</span>
                </div>
                <span className={getStatusBadge(item.status)}>{item.status}</span>
              </div>
              
              <div className="history-content">
                <h3>{item.description}</h3>
                <div className="history-meta">
                  {item.category && <span className="category">{item.category}</span>}
                  {item.condition && <span className="condition">{item.condition}</span>}
                </div>
                <p className="history-date">Created: {formatDate(item.created_at)}</p>
                
                {/* Type-specific details */}
                {item.type === 'RESALE' && (
                  <div className="resale-details">
                    {item.final_price && (
                      <p className="final-price">Sold for: ${item.final_price}</p>
                    )}
                    {item.buyer_email && (
                      <p className="buyer-info">Buyer: {item.buyer_email}</p>
                    )}
                  </div>
                )}
                
                {item.type === 'REPAIR' && (
                  <div className="repair-details">
                    {item.worker_notes && (
                      <p className="worker-notes">Notes: {item.worker_notes}</p>
                    )}
                    {item.estimated_completion && (
                      <p className="completion-date">Est. completion: {formatDate(item.estimated_completion)}</p>
                    )}
                  </div>
                )}
                
                {item.type === 'RECYCLE' && (
                  <div className="recycle-details">
                    {item.recycling_center && (
                      <p className="recycle-center">Center: {item.recycling_center}</p>
                    )}
                    {item.environmental_impact && (
                      <p className="env-impact">Impact: {item.environmental_impact}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
