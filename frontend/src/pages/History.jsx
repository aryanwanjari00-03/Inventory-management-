import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function History() {
  const [tab, setTab] = useState('billing');
  const [bills, setBills] = useState([]);
  const [invHistory, setInvHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/billing'),
      api.get('/inventory/history')
    ]).then(([bRes, hRes]) => {
      setBills(bRes.data);
      setInvHistory(hRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>History</h1>
          <p>View past bills and inventory changes</p>
        </div>
      </div>
      <div className="page-body">
        <div className="history-tabs">
          <button className={`history-tab ${tab === 'billing' ? 'active' : ''}`} onClick={() => setTab('billing')}>Billing History</button>
          <button className={`history-tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>Inventory History</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : tab === 'billing' ? (
          <div className="card slide-up">
            {bills.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📄</div><p>No billing history yet.</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Mobile</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>GST</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(bill => (
                      <tr key={bill._id}>
                        <td>{formatDate(bill.date)}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{bill.customerName}</td>
                        <td>{bill.mobileNumber}</td>
                        <td>{bill.items.map(i => `${i.itemName} x${i.quantity}`).join(', ')}</td>
                        <td>₹{bill.totalAmount.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${bill.gstApplied ? 'badge-success' : 'badge-warning'}`}>
                            {bill.gstApplied ? 'Yes' : 'No'}
                          </span>
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
          <div className="card slide-up">
            {invHistory.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📦</div><p>No inventory changes recorded yet.</p></div>
            ) : (
              <div>
                {invHistory.map(h => (
                  <div key={h._id} className="timeline-item">
                    <div className={`timeline-dot ${h.action}`}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {h.itemName}
                        <span className={`badge ${h.action === 'added' ? 'badge-success' : h.action === 'updated' ? 'badge-warning' : 'badge-danger'}`} style={{ marginLeft: 8 }}>
                          {h.action}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {h.action === 'added' && `Added with quantity ${h.newQuantity} at ₹${h.unitPrice}/unit`}
                        {h.action === 'updated' && `Quantity: ${h.oldQuantity} → ${h.newQuantity} | Price: ₹${h.unitPrice}/unit`}
                        {h.action === 'deleted' && `Removed (was ${h.oldQuantity} units)`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(h.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
