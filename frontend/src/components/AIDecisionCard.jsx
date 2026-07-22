export default function AIDecisionCard({ item, result, onChooseResale, onChooseRepair, onChooseRecycle, onBack }) {
  const { decision, reason, confidence } = result || {};
  const confidenceClass = (confidence || '').toLowerCase();
  const decisionLower = (decision || '').toLowerCase();

  return (
    <div className="ai-decision-card">
      <h2>AI recommendation</h2>
      {item && (
        <div className="item-summary">
          <p><strong>Item:</strong> {item.description}</p>
          {(item.category || item.condition || item.age) && (
            <p className="muted">{[item.category, item.condition, item.age].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      )}
      <div className={`recommendation recommendation-${decisionLower}`}>
        <span className="decision-badge">Recommended: {decision || '—'}</span>
        <span className={`confidence confidence-${confidenceClass}`}>{confidence || '—'}</span>
      </div>
      <p className="reason">{reason || 'No reason provided.'}</p>
      <p className="choose-label">You choose the action (AI does not force anything):</p>
      <div className="action-buttons">
        <button 
          type="button" 
          className={`action resale ${decisionLower === 'resale' ? 'recommended' : ''}`} 
          onClick={onChooseResale}
        >
          Proceed with Resale
        </button>
        <button 
          type="button" 
          className={`action repair ${decisionLower === 'repair' ? 'recommended' : ''}`} 
          onClick={onChooseRepair}
        >
          Proceed with Repair
        </button>
        <button 
          type="button" 
          className={`action recycle ${decisionLower === 'recycle' ? 'recommended' : ''}`} 
          onClick={onChooseRecycle}
        >
          Proceed with Recycle
        </button>
      </div>
      <button type="button" className="link-button" onClick={onBack}>Submit another item</button>
    </div>
  );
}
