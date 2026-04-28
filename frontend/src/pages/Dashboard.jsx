import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { HiOutlineCube, HiOutlineCurrencyRupee, HiOutlineDocumentText, HiOutlineExclamation } from 'react-icons/hi';

export default function Dashboard() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory');
      setInventory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = inventory.length;
  const totalStock = inventory.reduce((s, i) => s + i.quantity, 0);
  const totalValue = inventory.reduce((s, i) => s + i.totalPrice, 0);
  const lowStock = inventory.filter(i => i.quantity < 10).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.ownerName} — {user?.businessName}</p>
        </div>
      </div>
      <div className="page-body">
        <div className="stat-grid slide-up">
          <div className="stat-card">
            <div className="stat-card-icon purple"><HiOutlineCube /></div>
            <div className="stat-card-value">{totalItems}</div>
            <div className="stat-card-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon blue"><HiOutlineDocumentText /></div>
            <div className="stat-card-value">{totalStock}</div>
            <div className="stat-card-label">Total Stock Units</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><HiOutlineCurrencyRupee /></div>
            <div className="stat-card-value">₹{totalValue.toLocaleString('en-IN')}</div>
            <div className="stat-card-label">Total Stock Value</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon orange"><HiOutlineExclamation /></div>
            <div className="stat-card-value">{lowStock}</div>
            <div className="stat-card-label">Low Stock Items</div>
          </div>
        </div>

        <div className="card slide-up">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Live Inventory Overview</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
          ) : inventory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <p>No items in inventory yet. Go to Inventory to add items.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item._id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.itemName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>₹{item.totalPrice.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${item.quantity < 5 ? 'badge-danger' : item.quantity < 10 ? 'badge-warning' : 'badge-success'}`}>
                          {item.quantity < 5 ? 'Critical' : item.quantity < 10 ? 'Low' : 'In Stock'}
                        </span>
                      </td>
                      <td>{new Date(item.lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
