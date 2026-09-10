import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemInput from '../components/ItemInput';
import AIDecisionCard from '../components/AIDecisionCard';
import ResaleHub from '../components/ResaleHub';
import RepairRequest from '../components/RepairRequest';
import RecycleRequest from '../components/RecycleRequest';
import MarketplaceSection from '../components/MarketplaceSection';
import HistorySection from '../components/HistorySection';
import { API } from '../config.js';

function getStoredUser() {
  const raw = localStorage.getItem('reloop_user');
  return raw ? JSON.parse(raw) : null;
}

export default function UserDashboard() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('add-item');
  const [step, setStep] = useState('input');
  const [item, setItem] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [path, setPath] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleLogout() {
    localStorage.removeItem('reloop_user');
    navigate('/login');
  }

  async function handleSubmitItem(form) {
    setItem(form);
    try {
      const res = await fetch(`${API}/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          category: form.category || null,
          condition: form.condition || null,
          age: form.age || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI failed');
      setAiResult(data);
      setStep('decision');
    } catch (err) {
      setAiResult({ decision: 'RECYCLE', reason: 'Unable to get recommendation.', confidence: 'LOW' });
      setStep('decision');
    }
  }

  function handleChoosePath(choice) {
    setPath(choice);
    setStep('execute');
  }

  function handleReset() {
    setStep('input');
    setItem(null);
    setAiResult(null);
    setPath(null);
    setRefreshKey(prev => prev + 1); // Trigger refresh for marketplace and history
  }

  // Auto-refresh marketplace and history every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'marketplace' || activeTab === 'history') {
        setRefreshKey(prev => prev + 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="user-dashboard">
      <header className="dashboard-header">
        <h1>Reloop Plus</h1>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button type="button" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'add-item' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-item')}
        >
          ➕ Add New Item
        </button>
        <button 
          className={`tab-button ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
        >
          🛒 Items on Resale
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 Past History
        </button>
      </div>

      <main className="dashboard-main">
        {activeTab === 'add-item' && (
          <>
            {step === 'input' && (
              <section className="section">
                <h2>Submit an item</h2>
                <ItemInput onSubmit={handleSubmitItem} />
              </section>
            )}
            {step === 'decision' && aiResult && (
              <section className="section">
                <AIDecisionCard
                  item={item}
                  result={aiResult}
                  onChooseResale={() => handleChoosePath('RESALE')}
                  onChooseRepair={() => handleChoosePath('REPAIR')}
                  onChooseRecycle={() => handleChoosePath('RECYCLE')}
                  onBack={handleReset}
                />
              </section>
            )}
            {step === 'execute' && path === 'RESALE' && (
              <ResaleHub
                user={user}
                item={item}
                aiResult={aiResult}
                onDone={handleReset}
              />
            )}
            {step === 'execute' && path === 'REPAIR' && (
              <RepairRequest
                user={user}
                item={item}
                aiResult={aiResult}
                onDone={handleReset}
              />
            )}
            {step === 'execute' && path === 'RECYCLE' && (
              <RecycleRequest
                user={user}
                item={item}
                aiResult={aiResult}
                onDone={handleReset}
              />
            )}
          </>
        )}
        
        {activeTab === 'marketplace' && (
          <MarketplaceSection 
            user={user} 
            refreshKey={refreshKey}
            onBidPlaced={() => setRefreshKey(prev => prev + 1)}
          />
        )}
        
        {activeTab === 'history' && (
          <HistorySection 
            user={user} 
            refreshKey={refreshKey}
          />
        )}
      </main>
    </div>
  );
}
