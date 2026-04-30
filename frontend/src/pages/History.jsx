import { useState, useEffect } from 'react';
import api from '../utils/api';
import { HiCalendar, HiArrowUp, HiArrowDown } from 'react-icons/hi';

export default function History() {
  const [tab, setTab] = useState('billing');
  const [bills, setBills] = useState([]);
  const [invHistory, setInvHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/billing'),
      api.get('/inventory/history')
    ]).then(([bRes, hRes]) => {
      setBills(bRes.data);
      setInvHistory(hRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Filtering and Aggregation
  const filteredInvHistory = invHistory.filter(h => h.date.startsWith(selectedMonth));
  const filteredBills = bills.filter(b => b.date.startsWith(selectedMonth));

  const stats = filteredInvHistory.reduce((acc, h) => {
    const diff = h.newQuantity - h.oldQuantity;
    const value = Math.abs(diff) * (h.unitPrice || 0);
    
    if (diff > 0) {
      acc.totalIn += diff;
      acc.totalInValue += value;
    } else if (diff < 0) {
      acc.totalOut += Math.abs(diff);
      acc.totalOutValue += value;
    }
    return acc;
  }, { totalIn: 0, totalOut: 0, totalInValue: 0, totalOutValue: 0 });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>History</h1>
          <p>View past bills and inventory changes</p>
        </div>
      </div>
      <div className="page-body">
        <div className="history-tabs-container">
          <div className="history-tabs">
            <button className={`history-tab ${tab === 'billing' ? 'active' : ''}`} onClick={() => setTab('billing')}>Billing History</button>
            <button className={`history-tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>Inventory History</button>
          </div>
          <div className="month-picker">
            <HiCalendar style={{ color: 'var(--accent)', fontSize: 18 }} />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : tab === 'billing' ? (
          <div className="card slide-up">
            {filteredBills.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📄</div><p>No bills found for this month.</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(bill => (
                      <tr key={bill._id}>
                        <td>{formatDate(bill.date)}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bill.customerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bill.mobileNumber}</div>
                        </td>
                        <td>
                          <div className="bill-items-mini-list">
                            {bill.items.map((i, idx) => (
                              <div key={idx} className="bill-item-mini">
                                <span className="name">{i.itemName}</span>
                                <span className="spec">({i.litre}{i.unit === 'Litre' ? 'L' : i.unit === 'KG' ? 'kg' : ` ${i.unit || ''}`})</span>
                                <span className="qty">x{i.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{bill.grandTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="slide-up">
            {/* Monthly Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                  <HiArrowUp />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Inventory IN</span>
                  <div className="stat-value">₹{stats.totalInValue.toLocaleString('en-IN')}</div>
                  <span className="stat-sublabel">{stats.totalIn} items added</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <HiArrowDown />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Inventory OUT</span>
                  <div className="stat-value">₹{stats.totalOutValue.toLocaleString('en-IN')}</div>
                  <span className="stat-sublabel">{stats.totalOut} items sold/removed</span>
                </div>
              </div>
            </div>

            <div className="card">
              {filteredInvHistory.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">📦</div><p>No inventory changes for this month.</p></div>
              ) : (
                <div>
                  {filteredInvHistory.map(h => (
                    <div key={h._id} className="timeline-item">
                      <div className={`timeline-dot ${h.action}`}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            {h.itemName} ({h.litre}{h.unit === 'Litre' ? 'L' : h.unit === 'KG' ? 'kg' : ` ${h.unit || ''}`})
                          </span>
                          <span className={`badge ${h.action === 'added' ? 'badge-success' : h.action === 'updated' ? 'badge-warning' : 'badge-danger'}`}>
                            {h.action}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {h.action === 'added' && `Initial stock: ${h.newQuantity} units at ₹${h.unitPrice}/unit`}
                          {h.action === 'updated' && (
                            <>
                              Quantity change: <b>{h.oldQuantity} → {h.newQuantity}</b> 
                              {h.newQuantity > h.oldQuantity ? ' (Restocked)' : ' (Deducted)'}
                              {h.unitPrice > 0 && ` | Price: ₹${h.unitPrice}/unit`}
                            </>
                          )}
                          {h.action === 'deleted' && `Removed entirely (was ${h.oldQuantity} units)`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(h.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
