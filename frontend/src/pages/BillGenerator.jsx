import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HiPlus, HiTrash, HiDownload, HiPrinter } from 'react-icons/hi';

export default function BillGenerator() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [billItems, setBillItems] = useState([{ inventoryId: '', quantity: 1 }]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get('/inventory').then(r => setInventory(r.data)).catch(() => {});
    api.get('/billing/recent').then(r => setRecentBills(r.data)).catch(() => {});
  }, []);

  const gstApplied = !!(user?.gstNumber);

  const addRow = () => setBillItems([...billItems, { inventoryId: '', quantity: 1 }]);

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

  const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
    return str;
  };

  const generatePDF = (bill) => {
    // Switch to A5 size for practical shop billing
    const doc = new jsPDF('p', 'mm', 'a5');
    const w = doc.internal.pageSize.getWidth();

    // Header - Black & White
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, 10, w - 10, 10);
    doc.line(10, 38, w - 10, 38);

    // Logo (Grayscale if possible, but keeping logic)
    if (user?.shopLogo) {
      try {
        doc.addImage(user.shopLogo, 'PNG', 10, 12, 25, 25);
      } catch (e) { /* ignore logo errors */ }
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(user?.businessName || 'Paint Shop', w / 2, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.shopAddress || '', w / 2, 26, { align: 'center', maxWidth: w - 80 });
    doc.text(`Phone: ${user?.mobile || ''}`, w / 2, 34, { align: 'center' });

    // Customer info
    doc.setFontSize(10);
    const dateObj = new Date(bill.date);
    const billDate = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const billTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    doc.text(`Customer: ${bill.customerName}`, 10, 48);
    doc.text(`Mobile: ${bill.mobileNumber}`, 10, 54);
    doc.text(`Date: ${billDate}`, w - 10, 48, { align: 'right' });
    doc.text(`Time: ${billTime}`, w - 10, 54, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Bill #: ${bill._id.slice(-8).toUpperCase()}`, w - 10, 60, { align: 'right' });

    // Items table - Grayscale Theme
    autoTable(doc, {
      startY: 65,
      margin: { left: 10, right: 10 },
      head: [['#', 'Item', 'Qty', 'Price', 'Total']],
      body: bill.items.map((item, i) => [
        i + 1,
        `${item.itemName} ${item.litre ? `(${item.litre}${item.unit === 'Litre' ? 'L' : item.unit === 'KG' ? 'kg' : ` ${item.unit || ''}`})` : ''}`,
        item.quantity,
        item.unitPrice.toLocaleString('en-IN'),
        item.price.toLocaleString('en-IN')
      ]),
      styles: { fontSize: 9, cellPadding: 4, textColor: 0 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      theme: 'grid'
    });

    let finalY = doc.lastAutoTable.finalY + 8;

    // Amount in words
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount in words:', 10, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(numberToWords(bill.grandTotal), 10, finalY + 5, { maxWidth: w / 2 });

    // Totals
    doc.setFontSize(10);
    doc.text(`Subtotal: Rs.${bill.totalAmount.toLocaleString('en-IN')}`, w - 10, finalY, { align: 'right' });
    if (bill.gstApplied) {
      doc.text(`GST (18%): Rs.${bill.gstAmount.toLocaleString('en-IN')}`, w - 10, finalY + 6, { align: 'right' });
      finalY += 6;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total: Rs.${bill.grandTotal.toLocaleString('en-IN')}`, w - 10, finalY + 10, { align: 'right' });

    // Signatures
    const sigY = Math.max(finalY + 25, doc.internal.pageSize.getHeight() - 35);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(10, sigY, 45, sigY);
    doc.line(w - 45, sigY, w - 10, sigY);
    doc.setFontSize(8);
    doc.text('Customer Signature', 10, sigY + 4);
    doc.text('Authorized Signatory', w - 10, sigY + 4, { align: 'right' });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.line(10, footerY, w - 10, footerY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Owner: ${user?.ownerName || ''} | GST: ${user?.gstNumber || 'N/A'}`, w / 2, footerY + 6, { align: 'center' });
    doc.text('Thank you for your business!', w / 2, footerY + 10, { align: 'center' });

    return doc;
  };

  const handleGenerate = async () => {
    if (!customerName || !mobileNumber) return toast.error('Enter customer details');
    const validItems = billItems.filter(bi => bi.inventoryId && bi.quantity > 0);
    if (validItems.length === 0) return toast.error('Add at least one item');

    setGenerating(true);
    try {
      const res = await api.post('/billing', {
        customerName,
        mobileNumber,
        items: validItems,
        gstApplied
      });
      toast.success('Bill generated!');

      // Download PDF
      const doc = generatePDF(res.data);
      doc.save(`bill_${res.data._id.slice(-8)}.pdf`);

      // Reset
      setCustomerName('');
      setMobileNumber('');
      setBillItems([{ inventoryId: '', quantity: 1 }]);

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
      const doc = generatePDF(res.data);
      doc.save(`bill_${billId.slice(-8)}.pdf`);
    } catch { toast.error('Failed to download bill'); }
  };

  const printBill = async (billId) => {
    try {
      const res = await api.get(`/billing/${billId}`);
      const doc = generatePDF(res.data);
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
                    <select value={bi.inventoryId} onChange={e => updateRow(i, 'inventoryId', e.target.value)}>
                      <option value="">Select item...</option>
                      {inventory.map(inv => (
                        <option key={inv._id} value={inv._id}>
                          {inv.itemName} ({inv.litre}{inv.unit === 'Litre' ? 'L' : inv.unit === 'KG' ? 'kg' : ` ${inv.unit || ''}`}) - Stock: {inv.quantity}
                        </option>
                      ))}
                    </select>
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

          <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate & Download Bill'}
          </button>
        </div>

        {/* Recent Bills */}
        <div className="recent-bills slide-up">
          <h3>Recent Bills</h3>
          {recentBills.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <p style={{ fontSize: 14 }}>No bills generated yet.</p>
            </div>
          ) : (
            recentBills.map(bill => (
              <div key={bill._id} className="bill-card">
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bill.customerName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(bill.date).toLocaleDateString('en-IN')} · {bill.items.length} items
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
