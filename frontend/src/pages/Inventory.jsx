import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('list'); // 'list' or 'history'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ itemName: '', litre: '1', unit: 'Litre', quantity: '', unitPrice: '' });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const [iRes, hRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/history')
      ]);
      setItems(iRes.data);
      setHistory(hRes.data);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ itemName: '', litre: '1', unit: 'Litre', quantity: '', unitPrice: '' });
    setShowAdd(false);
    setEditItem(null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.itemName || !form.quantity || !form.unitPrice || !form.litre) return toast.error('Fill all fields');
    try {
      await api.post('/inventory', { 
        itemName: form.itemName, 
        litre: form.litre,
        unit: form.unit,
        quantity: Number(form.quantity), 
        unitPrice: Number(form.unitPrice) 
      });
      toast.success('Item added!');
      resetForm();
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.quantity || !form.unitPrice || !form.litre) return toast.error('Fill all fields');
    try {
      await api.put(`/inventory/${editItem._id}`, { 
        quantity: Number(form.quantity), 
        unitPrice: Number(form.unitPrice),
        litre: form.litre,
        unit: form.unit
      });
      toast.success('Item updated!');
      resetForm();
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      toast.success('Item deleted');
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ 
      itemName: item.itemName, 
      litre: item.litre || '1',
      unit: item.unit || 'Litre',
      quantity: String(item.quantity), 
      unitPrice: String(item.unitPrice) 
    });
    setShowAdd(false);
  };

  const totalCost = form.quantity && form.unitPrice ? (Number(form.quantity) * Number(form.unitPrice)) : 0;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filteredHistory = history.filter(h => h.date.startsWith(selectedMonth));
  
  const stats = filteredHistory.reduce((acc, h) => {
    const diff = (h.newQuantity || 0) - (h.oldQuantity || 0);
    if (diff > 0) {
      acc.totalIn += diff;
      acc.totalInValue += (diff * (h.unitPrice || 0));
    }
    return acc;
  }, { totalIn: 0, totalInValue: 0 });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Manage paints, brushes, and other supplies</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {tab === 'history' && (
            <input 
              type="month" 
              className="month-picker"
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px' }}
            />
          )}
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowAdd(true); }}>
            <HiPlus /> Add Item
          </button>
        </div>
      </div>
      <div className="page-body">
        <div className="history-tabs" style={{ marginBottom: 24, justifyContent: 'flex-start' }}>
          <button className={`history-tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Stock Records</button>
          <button className={`history-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Purchase History</button>
        </div>
        {/* Add/Edit Modal */}
        {(showAdd || editItem) && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
            <div className="modal">
              <div className="modal-header">
                <h2>{editItem ? 'Update Item' : 'Add New Item'}</h2>
                <button className="btn-icon" onClick={resetForm}><HiX /></button>
              </div>
              <form onSubmit={editItem ? handleUpdate : handleAdd}>

                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Asian Paints Royale / Paint Brush"
                      value={form.itemName}
                      onChange={e => setForm({ ...form, itemName: e.target.value })}
                      disabled={!!editItem}
                      style={editItem ? { opacity: 0.6 } : {}}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit Type</label>
                    <select 
                      value={form.unit} 
                      onChange={e => setForm({ ...form, unit: e.target.value })}
                    >
                      <option value="Litre">Litre (L)</option>
                      <option value="KG">KG (kg)</option>
                      <option value="Pieces">Pieces (pcs)</option>
                      <option value="Packet">Packet</option>
                      <option value="Box">Box</option>
                      <option value="Roll">Roll</option>
                      <option value="Set">Set</option>
                    </select>
                  </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>{form.unit === 'Litre' ? 'Litre (L)' : form.unit === 'KG' ? 'Weight (kg)' : 'Size/Spec'}</label>
                    {form.unit === 'Litre' ? (
                      <select 
                        value={form.litre} 
                        onChange={e => setForm({ ...form, litre: e.target.value })}
                      >
                        <option value="0.5">0.5 L</option>
                        <option value="1">1 L</option>
                        <option value="4">4 L</option>
                        <option value="10">10 L</option>
                        <option value="20">20 L</option>
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        placeholder={form.unit === 'KG' ? 'e.g. 5' : 'e.g. Standard'} 
                        value={form.litre} 
                        onChange={e => setForm({ ...form, litre: e.target.value })} 
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" placeholder="0" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Unit Price (₹)</label>
                    <input type="number" placeholder="0" min="0" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Total Cost</label>
                  <input type="text" value={`₹${totalCost.toLocaleString('en-IN')}`} disabled style={{ opacity: 0.7, fontWeight: 600 }} />
                </div>
                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
                  {editItem ? 'Update Item' : 'Add to Inventory'}
                </button>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : tab === 'list' ? (
          <div className="card slide-up">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Name</th>
                    <th>Size/Unit</th>
                    <th>Total Stock Added</th>
                    <th>Unit Price</th>
                    <th>Total Investment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item._id}>
                      <td>{idx + 1}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.itemName}</td>
                      <td>
                        {item.unit === 'Litre' ? `${item.litre} L` : item.unit === 'KG' ? `${item.litre} kg` : `${item.litre} ${item.unit || ''}`}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.totalStockAdded || item.quantity}</td>
                      <td>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>₹{((item.totalStockAdded || item.quantity) * item.unitPrice).toLocaleString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" onClick={() => openEdit(item)} title="Edit"><HiPencil /></button>
                          <button className="btn-icon" onClick={() => handleDelete(item._id)} title="Delete" style={{ color: 'var(--danger)' }}><HiTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="slide-up">
            <div className="stats-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-label">Total Stock Added ({selectedMonth})</span>
                  <div className="stat-value">₹{stats.totalInValue.toLocaleString('en-IN')}</div>
                  <span className="stat-sublabel">{stats.totalIn} units brought in</span>
                </div>
              </div>
            </div>
            <div className="card">
              {filteredHistory.length === 0 ? (
                <div className="empty-state"><p>No inventory changes for this month.</p></div>
              ) : (
                <div>
                  {filteredHistory.map(h => (
                    <div key={h._id} className="timeline-item">
                      <div className={`timeline-dot ${h.action}`}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{h.itemName} ({h.litre}{h.unit === 'Litre' ? 'L' : h.unit === 'KG' ? 'kg' : ` ${h.unit || ''}`})</span>
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
