import { jsPDF } from 'jspdf';
import { Order } from '../types';

export function generateInvoicePDF(order: Order): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const darkBg = [15, 15, 15]; // #0F0F0F
  const goldPrimary = [212, 175, 55]; // #D4AF37
  const goldLight = [243, 229, 171]; // #F3E5AB
  const textWhite = [248, 248, 248];
  const textMuted = [160, 160, 160];

  // Draw Header Background
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, 210, 45, 'F');

  // Gold accent bar
  doc.setFillColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.rect(0, 43, 210, 2, 'F');

  // Brand Header
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(goldLight[0], goldLight[1], goldLight[2]);
  doc.text('AL-SAIFEE PERFUMES', 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('HAUTE PARFUMERIE & WILD AGED OUD', 15, 27);
  doc.text('concierge@alsaifeeperfumes.com | www.alsaifeeperfumes.com', 15, 33);

  // Invoice Title Right
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('INVOICE', 195, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
  doc.text(`Order #: ${order.orderNumber}`, 195, 29, { align: 'right' });
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 195, 35, { align: 'right' });

  // Customer & Shipping Info
  let y = 58;

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 15, 15);
  doc.text('BILLED TO / SHIPPING ADDRESS', 15, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const addr = order.shippingAddress;
  doc.text(`Customer: ${order.customerName}`, 15, y);
  doc.text(`Email: ${order.customerEmail}`, 15, y + 5);

  if (addr) {
    if (addr.phone) doc.text(`Phone: ${addr.phone}`, 15, y + 10);
    const street = `${addr.addressLine1 || ''} ${addr.addressLine2 || ''}`.trim();
    const cityState = `${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}`.trim();
    if (street) doc.text(`Address: ${street}`, 15, y + 15);
    if (cityState) doc.text(`${cityState}, ${addr.country || 'India'}`, 15, y + 20);
    y += 26;
  } else {
    y += 12;
  }

  // Items Table Header
  y += 5;
  doc.setFillColor(20, 20, 20);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('ITEM DESCRIPTION', 20, y + 5.5);
  doc.text('SIZE', 110, y + 5.5);
  doc.text('QTY', 140, y + 5.5);
  doc.text('PRICE (INR)', 160, y + 5.5);
  doc.text('TOTAL (INR)', 190, y + 5.5, { align: 'right' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);

  order.items.forEach((item) => {
    doc.text(item.product.title, 20, y);
    doc.text(item.selectedSize || '50ml', 110, y);
    doc.text(String(item.quantity), 140, y);
    doc.text(`Rs. ${item.price.toLocaleString('en-IN')}`, 160, y);
    doc.text(`Rs. ${(item.price * item.quantity).toLocaleString('en-IN')}`, 190, y, { align: 'right' });

    y += 4;
    doc.setDrawColor(230, 230, 230);
    doc.line(15, y, 195, y);
    y += 6;
  });

  // Summary Table Right
  y += 5;
  const sumX = 130;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal:', sumX, y);
  doc.text(`Rs. ${order.subtotal.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  if (order.discount > 0) {
    y += 6;
    doc.text('Discount:', sumX, y);
    doc.text(`-Rs. ${order.discount.toLocaleString('en-IN')}`, 190, y, { align: 'right' });
  }

  y += 6;
  doc.text('Estimated Tax (10%):', sumX, y);
  doc.text(`Rs. ${order.tax.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 6;
  doc.text('Express Shipping:', sumX, y);
  doc.text(order.shippingFee === 0 ? 'FREE' : `Rs. ${order.shippingFee.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 8;
  doc.setFillColor(15, 15, 15);
  doc.rect(sumX - 5, y - 5, 70, 10, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('TOTAL PAID:', sumX, y + 1.5);
  doc.text(`Rs. ${order.total.toLocaleString('en-IN')}`, 190, y + 1.5, { align: 'right' });

  // Footer Note
  y += 30;
  doc.setDrawColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.line(15, y, 195, y);

  y += 8;
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for choosing Al-Saifee Perfumes.', 105, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('For assistance with your artisanal order, contact concierge@alsaifeeperfumes.com', 105, y, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(order: Order) {
  const doc = generateInvoicePDF(order);
  doc.save(`Invoice_${order.orderNumber}.pdf`);
}
