import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ itemName: '', quantity: '', unitPrice: '' });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/inventory');
      setItems(res.data);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ itemName: '', quantity: '', unitPrice: '' });
    setShowAdd(false);
    setEditItem(null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.itemName || !form.quantity || !form.unitPrice) return toast.error('Fill all fields');
    try {
      await api.post('/inventory', { itemName: form.itemName, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) });
      toast.success('Item added!');
      resetForm();
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.quantity || !form.unitPrice) return toast.error('Fill all fields');
    try {
      await api.put(`/inventory/${editItem._id}`, { quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) });
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
    setForm({ itemName: item.itemName, quantity: String(item.quantity), unitPrice: String(item.unitPrice) });
    setShowAdd(false);
  };

  const totalCost = form.quantity && form.unitPrice ? (Number(form.quantity) * Number(form.unitPrice)) : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Add, update, and manage your paint stock</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowAdd(true); }}>
          <HiPlus /> Add Item
        </button>
      </div>
      <div className="page-body">
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
                    placeholder="e.g. Asian Paints Royale 1L"
                    value={form.itemName}
                    onChange={e => setForm({ ...form, itemName: e.target.value })}
                    disabled={!!editItem}
                    style={editItem ? { opacity: 0.6 } : {}}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>No items yet. Click "Add Item" to get started.</p>
          </div>
        ) : (
          <div className="card slide-up">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Name</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item._id}>
                      <td>{idx + 1}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.itemName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>₹{item.totalPrice.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${item.quantity < 5 ? 'badge-danger' : item.quantity < 10 ? 'badge-warning' : 'badge-success'}`}>
                          {item.quantity < 5 ? 'Critical' : item.quantity < 10 ? 'Low' : 'In Stock'}
                        </span>
                      </td>
                      <td>{new Date(item.lastUpdated).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
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
        )}
      </div>
    </div>
  );
}
