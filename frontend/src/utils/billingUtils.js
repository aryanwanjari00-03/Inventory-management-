import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const numberToWords = (num) => {
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

export const generatePDF = (bill, user) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();

  // Header - Black & White
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(10, 10, w - 10, 10);
  doc.line(10, 38, w - 10, 38);

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
  
  const addressLabel = "Address: ";
  const addressValue = bill.customerAddress || 'N/A';
  const addressLines = doc.splitTextToSize(addressLabel + addressValue, 65);
  doc.text(addressLines, 10, 54);
  
  const addressHeight = (addressLines.length * 5);
  const mobileY = 54 + addressHeight;
  const paymentY = mobileY + 6;
  
  doc.text(`Mobile: ${bill.mobileNumber}`, 10, mobileY);
  doc.text(`Payment Mode: ${bill.paymentMode || 'Cash'}`, 10, paymentY);

  doc.text(`Date: ${billDate}`, w - 10, 48, { align: 'right' });
  doc.text(`Time: ${billTime}`, w - 10, 54, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Bill #: ${bill._id.slice(-8).toUpperCase()}`, w - 10, 60, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  // Draw line before table
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(10, paymentY + 4, w - 10, paymentY + 4);

  autoTable(doc, {
    startY: paymentY + 8,
    margin: { left: 10, right: 10 },
    head: [['#', 'Color/Code', 'Item', 'Qty', 'Price', 'Total']],
    body: bill.items.map((item, i) => [
      i + 1,
      item.unit === 'Litre' ? (item.color || '[        ]') : '-',
      `${item.itemName}${item.litre ? ` (${item.unit === 'Litre' ? (item.litre.includes('ml') ? item.litre : `${item.litre} L`) : item.unit === 'KG' ? `${item.litre} kg` : `${item.litre} ${item.unit || ''}`})` : ''}`,
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

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in words:', 10, finalY);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(bill.grandTotal), 10, finalY + 5, { maxWidth: w / 2 });

  doc.setFontSize(10);
  doc.text(`Subtotal: Rs.${bill.totalAmount.toLocaleString('en-IN')}`, w - 10, finalY, { align: 'right' });
  if (bill.gstApplied) {
    doc.text(`GST (18%): Rs.${bill.gstAmount.toLocaleString('en-IN')}`, w - 10, finalY + 6, { align: 'right' });
    finalY += 6;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: Rs.${bill.grandTotal.toLocaleString('en-IN')}`, w - 10, finalY + 10, { align: 'right' });

  const sigY = Math.max(finalY + 25, doc.internal.pageSize.getHeight() - 35);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(10, sigY, 45, sigY);
  doc.line(w - 45, sigY, w - 10, sigY);
  doc.setFontSize(8);
  doc.text('Customer Signature', 10, sigY + 4);
  doc.text('Authorized Signatory', w - 10, sigY + 4, { align: 'right' });

  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Owner: ${user?.ownerName || ''} | GST: ${user?.gstNumber || 'N/A'}`, w / 2, footerY + 6, { align: 'center' });
  doc.text('Thank you for your business!', w / 2, footerY + 10, { align: 'center' });

  const pageCount = doc.internal.getNumberOfPages();
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.rect(5, 5, w - 10, doc.internal.pageSize.getHeight() - 10);
  }

  return doc;
};
