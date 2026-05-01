import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { generatePDF } from '../utils/billingUtils';
import { HiPlus, HiTrash, HiDownload, HiPrinter } from 'react-icons/hi';

const SearchableSelect = ({ value, onChange, options, placeholder }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', marginBottom: 0 }}>
      <input
        type="text"
        placeholder={selectedOption ? selectedOption.label : placeholder}
        value={isOpen ? search : (selectedOption ? selectedOption.label : '')}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          onChange('');
        }}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', transition: 'border-color 0.2s ease', outline: 'none' }}
      />
      {isOpen && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, 
          background: 'var(--bg-card)', border: '1px solid var(--border)', 
          borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', 
          zIndex: 50, listStyle: 'none', padding: 0, margin: 0,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
        }}>
          {options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())).map(o => (
            <li 
              key={o.value} 
              onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setIsOpen(false); setSearch(''); }}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-primary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            >
              {o.label}
            </li>
          ))}
          {options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <li style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>No items found</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default function BillGenerator() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [billItems, setBillItems] = useState([{ inventoryId: '', quantity: 1, colorCode: '' }]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [generating, setGenerating] = useState(false);
  const [recentSearch, setRecentSearch] = useState('');
  const [recentPaymentFilter, setRecentPaymentFilter] = useState('All');

  useEffect(() => {
    api.get('/inventory').then(r => setInventory(r.data)).catch(() => {});
    api.get('/billing/recent').then(r => setRecentBills(r.data)).catch(() => {});
  }, []);

  const gstApplied = !!(user?.gstNumber);

  const addRow = () => setBillItems([...billItems, { inventoryId: '', quantity: 1, colorCode: '' }]);

  const removeRow = (i) => {
    if (billItems.length <= 1) return;
    setBillItems(billItems.filter((_, idx) => idx !== i));
  };

  const updateRow = (i, field, value) => {
    const updated = [...billItems];
    updated[i] = { ...updated[i], [field]: value };
    setBillItems(updated);
  };

  const getItem = (id) => inventory.find(i => i._id === id);

  const subtotal = billItems.reduce((sum, bi) => {
    const item = getItem(bi.inventoryId);
    return sum + (item ? item.unitPrice * bi.quantity : 0);
  }, 0);
  const gstAmount = gstApplied ? subtotal * 0.18 : 0;
  const grandTotal = subtotal + gstAmount;



  const handleGenerate = async (shouldPrint = false) => {
    if (!customerName || !mobileNumber) return toast.error('Enter customer details');
    const validItems = billItems.filter(bi => bi.inventoryId && bi.quantity > 0);
    if (validItems.length === 0) return toast.error('Add at least one item');

    setGenerating(true);
    try {
      const res = await api.post('/billing', {
        customerName,
        mobileNumber,
        customerAddress,
        items: validItems,
        gstApplied,
        paymentMode
      });
      toast.success('Bill generated!');

      // Process PDF
      const doc = generatePDF(res.data, user);
      if (shouldPrint) {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bill_${res.data._id.slice(-8)}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }

      // Reset
      setCustomerName('');
      setMobileNumber('');
      setCustomerAddress('');
      setBillItems([{ inventoryId: '', quantity: 1, colorCode: '' }]);

      // Refresh
      api.get('/billing/recent').then(r => setRecentBills(r.data));
      api.get('/inventory').then(r => setInventory(r.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  const downloadBill = async (billId) => {
    try {
      const res = await api.get(`/billing/${billId}`);
      const doc = generatePDF(res.data, user);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bill_${billId.slice(-8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download bill'); }
  };

  const printBill = async (billId) => {
    try {
      const res = await api.get(`/billing/${billId}`);
      const doc = generatePDF(res.data, user);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch { toast.error('Failed to print bill'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Bill Generator</h1>
          <p>Create invoices for your customers</p>
        </div>
      </div>
      <div className="page-body">
        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>New Bill</h3>
          <div className="bill-form-section">
            <div className="form-group">
              <label>Customer Name</label>
              <input type="text" placeholder="Enter customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input type="tel" placeholder="10-digit number" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Customer Address</label>
              <input type="text" placeholder="Enter customer address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Payment Mode</label>
              <select 
                value={paymentMode} 
                onChange={e => setPaymentMode(e.target.value)}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
              >
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </select>
            </div>
          </div>

          <div className="bill-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Items</label>
              <button className="btn btn-secondary btn-sm" onClick={addRow}><HiPlus /> Add Row</button>
            </div>

            {billItems.map((bi, i) => {
              const item = getItem(bi.inventoryId);
              return (
                <div key={i} className="bill-item-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <SearchableSelect 
                      value={bi.inventoryId}
                      onChange={(val) => updateRow(i, 'inventoryId', val)}
                      placeholder="Search or select item..."
                      options={inventory.map(inv => ({
                        value: inv._id,
                        label: `${inv.itemName} ${inv.color ? `[${inv.color}] ` : ''}(${inv.unit === 'Litre' ? (inv.litre.includes('ml') ? inv.litre : `${inv.litre} L`) : inv.unit === 'KG' ? `${inv.litre} kg` : `${inv.litre} ${inv.unit || ''}`}) - Stock: ${inv.quantity}`
                      }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    {item?.unit === 'Litre' ? (
                      <input 
                        type="text" 
                        value={bi.colorCode || ''} 
                        onChange={e => updateRow(i, 'colorCode', e.target.value)} 
                        placeholder="Color Code" 
                      />
                    ) : (
                      <input type="text" value="-" disabled style={{ opacity: 0.5, textAlign: 'center' }} />
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="number" min="1" max={item?.quantity || 999} value={bi.quantity} onChange={e => updateRow(i, 'quantity', Number(e.target.value))} placeholder="Qty" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="text" value={item ? `₹${item.unitPrice}` : '-'} disabled style={{ opacity: 0.7 }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="text" value={item ? `₹${(item.unitPrice * bi.quantity).toLocaleString('en-IN')}` : '-'} disabled style={{ opacity: 0.7, fontWeight: 600 }} />
                  </div>
                  <button className="btn-icon" onClick={() => removeRow(i)} style={{ color: 'var(--danger)', marginBottom: 0 }}><HiTrash /></button>
                </div>
              );
            })}
          </div>

          <div className="bill-summary">
            <div className="bill-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {gstApplied && (
              <div className="bill-summary-row">
                <span>GST (18%)</span>
                <span>₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {!gstApplied && (
              <div className="bill-summary-row" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                <span>GST</span>
                <span>Not applied (Add GST number in Settings)</span>
              </div>
            )}
            <div className="bill-summary-row total">
              <span>Grand Total</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1 }} 
              onClick={() => handleGenerate(false)} 
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate & Download'}
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1 }} 
              onClick={() => handleGenerate(true)} 
              disabled={generating}
            >
              <HiPrinter /> {generating ? 'Generating...' : 'Generate & Print'}
            </button>
          </div>
        </div>

        {/* Recent Bills */}
        <div className="recent-bills slide-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Recent Bills</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <input 
                type="text" 
                placeholder="Search customer..." 
                value={recentSearch} 
                onChange={e => setRecentSearch(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 12, width: 180 }}
              />
              <select 
                value={recentPaymentFilter} 
                onChange={e => setRecentPaymentFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                <option value="All">All Payments</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </select>
            </div>
          </div>
          {recentBills.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <p style={{ fontSize: 14 }}>No bills generated yet.</p>
            </div>
          ) : (
            recentBills
              .filter(b => b.customerName.toLowerCase().includes(recentSearch.toLowerCase()))
              .filter(b => recentPaymentFilter === 'All' || b.paymentMode === recentPaymentFilter)
              .map(bill => (
              <div key={bill._id} className="bill-card">
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bill.customerName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span className={`badge ${bill.paymentMode === 'Online' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                      {bill.paymentMode || 'Cash'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(bill.date).toLocaleDateString('en-IN')} · {bill.items.reduce((s, i) => s + i.quantity, 0)} units
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>₹{bill.grandTotal.toLocaleString('en-IN')}</span>
                  <button className="btn-icon" onClick={() => downloadBill(bill._id)} title="Download PDF"><HiDownload /></button>
                  <button className="btn-icon" onClick={() => printBill(bill._id)} title="Print"><HiPrinter /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
