import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../config.js';

function getStoredUser() {
  const raw = localStorage.getItem('reloop_user');
  return raw ? JSON.parse(raw) : null;
}

export default function WorkerDashboard() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [repairJobs, setRepairJobs] = useState([]);
  const [recycleJobs, setRecycleJobs] = useState([]);
  const [myRepair, setMyRepair] = useState([]);
  const [myRecycle, setMyRecycle] = useState([]);
  const [tab, setTab] = useState('repair');

  function load() {
    fetch(`${API}/repair/requests/available`).then((r) => r.json()).then(setRepairJobs);
    fetch(`${API}/recycle/requests/available`).then((r) => r.json()).then(setRecycleJobs);
    fetch(`${API}/repair/requests?workerId=${user?.id}`).then((r) => r.json()).then(setMyRepair);
    fetch(`${API}/recycle/requests?workerId=${user?.id}`).then((r) => r.json()).then(setMyRecycle);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [user?.id]);

  function handleLogout() {
    localStorage.removeItem('reloop_user');
    navigate('/login');
  }

  async function acceptRepair(id) {
    await fetch(`${API}/repair/requests/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId: user.id, workerEmail: user.email }),
    });
    load();
  }

  async function acceptRecycle(id) {
    await fetch(`${API}/recycle/requests/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId: user.id, workerEmail: user.email }),
    });
    load();
  }

  async function updateStatus(type, id, status) {
    const base = type === 'repair' ? `${API}/repair` : `${API}/recycle`;
    await fetch(`${base}/requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="worker-dashboard">
      <header className="dashboard-header">
        <h1>Reloop Plus – Worker</h1>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button type="button" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="tabs">
          <button type="button" className={tab === 'repair' ? 'active' : ''} onClick={() => setTab('repair')}>Repair</button>
          <button type="button" className={tab === 'recycle' ? 'active' : ''} onClick={() => setTab('recycle')}>Recycle</button>
        </div>
        {tab === 'repair' && (
          <>
            <section className="section">
              <h2>Available repair jobs</h2>
              {repairJobs.length === 0 ? (
                <p className="muted">No pending repair jobs.</p>
              ) : (
                <ul className="job-list">
                  {repairJobs.map((j) => (
                    <li key={j.id} className="job-card">
                      <p><strong>{j.description}</strong></p>
                      <p className="muted">{j.category || '—'} · {j.condition || '—'}</p>
                      <button type="button" onClick={() => acceptRepair(j.id)}>Accept</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="section">
              <h2>My repair jobs</h2>
              {myRepair.length === 0 ? (
                <p className="muted">None yet.</p>
              ) : (
                <ul className="job-list">
                  {myRepair.map((j) => (
                    <li key={j.id} className="job-card">
                      <p><strong>{j.description}</strong></p>
                      <p className="status">{j.status}</p>
                      <div className="status-actions">
                        {j.status === 'ACCEPTED' && (
                          <button type="button" onClick={() => updateStatus('repair', j.id, 'IN_PROGRESS')}>Mark In Progress</button>
                        )}
                        {(j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS') && (
                          <button type="button" onClick={() => updateStatus('repair', j.id, 'COMPLETED')}>Mark Completed</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        {tab === 'recycle' && (
          <>
            <section className="section">
              <h2>Available recycle jobs</h2>
              {recycleJobs.length === 0 ? (
                <p className="muted">No pending recycle jobs.</p>
              ) : (
                <ul className="job-list">
                  {recycleJobs.map((j) => (
                    <li key={j.id} className="job-card">
                      <p><strong>{j.description}</strong></p>
                      <p className="muted">{j.choice === 'VALUE' ? 'Est. value requested' : 'Responsible recycle'}</p>
                      <button type="button" onClick={() => acceptRecycle(j.id)}>Accept</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="section">
              <h2>My recycle jobs</h2>
              {myRecycle.length === 0 ? (
                <p className="muted">None yet.</p>
              ) : (
                <ul className="job-list">
                  {myRecycle.map((j) => (
                    <li key={j.id} className="job-card">
                      <p><strong>{j.description}</strong></p>
                      <p className="status">{j.status}</p>
                      <div className="status-actions">
                        {j.status === 'ACCEPTED' && (
                          <button type="button" onClick={() => updateStatus('recycle', j.id, 'IN_PROGRESS')}>Mark In Progress</button>
                        )}
                        {(j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS') && (
                          <button type="button" onClick={() => updateStatus('recycle', j.id, 'COMPLETED')}>Mark Completed</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
