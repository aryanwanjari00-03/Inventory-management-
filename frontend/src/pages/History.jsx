import { useState, useEffect } from 'react';
import api from '../utils/api';
import { HiCalendar, HiArrowUp, HiArrowDown, HiDownload, HiPrinter, HiDocumentReport } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { generatePDF } from '../utils/billingUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function History() {
  const { user } = useAuth();
  const [tab, setTab] = useState('billing');
  const [bills, setBills] = useState([]);
  const [invHistory, setInvHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');

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
  
  let filteredBills = bills.filter(b => b.date.startsWith(selectedMonth));
  if (paymentFilter !== 'All') {
    filteredBills = filteredBills.filter(b => b.paymentMode === paymentFilter);
  }
  if (productFilter !== 'All') {
    filteredBills = filteredBills.filter(b => b.items.some(i => i.itemName === productFilter));
  }

  // Get unique products for the filter
  const uniqueProducts = Array.from(new Set(bills.flatMap(b => b.items.map(i => i.itemName)))).sort();

  const stats = filteredInvHistory.reduce((acc, h) => {
    const oldQ = h.oldQuantity || 0;
    const newQ = h.newQuantity || 0;
    const diff = newQ - oldQ;
    const uPrice = h.unitPrice || 0;
    const value = Math.abs(diff) * uPrice;
    
    if (diff > 0) {
      acc.totalIn += diff;
      acc.totalInValue += value;
    } else if (diff < 0) {
      acc.totalOut += Math.abs(diff);
      acc.totalOutValue += value;
    }
    return acc;
  }, { totalIn: 0, totalOut: 0, totalInValue: 0, totalOutValue: 0 });

  const downloadBill = (bill) => {
    try {
      const doc = generatePDF(bill, user);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bill_${bill._id.slice(-8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download bill'); }
  };

  const printBill = (bill) => {
    try {
      const doc = generatePDF(bill, user);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch { toast.error('Failed to print bill'); }
  };

  const exportToPDF = () => {
    if (filteredBills.length === 0) return toast.error('No data to export');
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(user?.businessName || 'Paint Shop', w / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Monthly Billing Report - ${selectedMonth}`, w / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 15, 40);

    // Summary Stats
    const totalSales = filteredBills.reduce((s, b) => s + b.grandTotal, 0);
    const cashSales = filteredBills.filter(b => b.paymentMode === 'Cash').reduce((s, b) => s + b.grandTotal, 0);
    const onlineSales = filteredBills.filter(b => b.paymentMode === 'Online').reduce((s, b) => s + b.grandTotal, 0);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Bills', filteredBills.length],
        ['Total Sales Amount', `Rs.${totalSales.toLocaleString('en-IN')}`],
        ['Cash Sales', `Rs.${cashSales.toLocaleString('en-IN')}`],
        ['Online Sales', `Rs.${onlineSales.toLocaleString('en-IN')}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181] },
      margin: { left: 15, right: 15 }
    });

    // Detailed Table
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [['Date', 'Customer', 'Payment', 'Total Amount']],
      body: filteredBills.map(b => [
        new Date(b.date).toLocaleDateString('en-IN'),
        b.customerName,
        b.paymentMode || 'Cash',
        `Rs.${b.grandTotal.toLocaleString('en-IN')}`
      ]),
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 15, right: 15 }
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Billing_Report_${selectedMonth}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
            <button className="history-tab active">Billing History</button>
          </div>
          <div className="month-picker">
            <HiCalendar style={{ color: 'var(--accent)', fontSize: 18 }} />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
            />
          </div>
          <button className="btn btn-secondary" onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiDocumentReport /> Export PDF Report
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : (
          <div className="slide-up">
            {/* Monthly Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                  <HiArrowUp />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Inventory IN</span>
                  <div className="stat-value" style={{ fontSize: 18 }}>₹{stats.totalInValue.toLocaleString('en-IN')}</div>
                  <span className="stat-sublabel">{stats.totalIn} units added</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <HiArrowDown />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Inventory OUT</span>
                  <div className="stat-value" style={{ fontSize: 18 }}>₹{stats.totalOutValue.toLocaleString('en-IN')}</div>
                  <span className="stat-sublabel">{stats.totalOut} units removed</span>
                </div>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}>
                  📄
                </div>
                <div className="stat-info">
                  <span className="stat-label">Monthly Sales</span>
                  <div className="stat-value" style={{ fontSize: 18 }}>₹{filteredBills.reduce((s, b) => s + b.grandTotal, 0).toLocaleString('en-IN')}</div>
                  <span className="stat-sublabel">{filteredBills.length} bills generated</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                  <label>Filter by Payment</label>
                  <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                    <option value="All">All Payments</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                  <label>Filter by Product</label>
                  <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                    <option value="All">All Products</option>
                    {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
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
                        <th>Payment</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBills.map(bill => (
                        <tr key={bill._id}>
                          <td>{formatDate(bill.date)}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bill.customerName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bill.mobileNumber}</div>
                            {bill.customerAddress && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bill.customerAddress}>{bill.customerAddress}</div>}
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
                          <td>
                            <span className={`badge ${bill.paymentMode === 'Online' ? 'badge-primary' : 'badge-secondary'}`}>
                              {bill.paymentMode || 'Cash'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{bill.grandTotal.toLocaleString('en-IN')}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn-icon" onClick={() => downloadBill(bill)} title="Download PDF"><HiDownload /></button>
                              <button className="btn-icon" onClick={() => printBill(bill)} title="Print"><HiPrinter /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
