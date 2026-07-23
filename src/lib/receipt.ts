export function generateReceiptHTML(data: {
  type: "package" | "flight";
  trackingId?: string;
  deliveryDate?: string;
  senderName?: string;
  senderAddress?: string;
  receiverName?: string;
  receiverEmail?: string;
  receiverAddress?: string;
  origin?: string;
  destination?: string;
  content?: string;
  weight?: string;
  quantity?: string;
  action?: string;
  paymentStatus?: string;
  estDelivery?: string;
  shippingFee?: string;
  ownerPhotoUrl?: string;
  paymentMethods?: { name: string; details: string }[];
  flightNumber?: string;
  airline?: string;
  seatNumber?: string;
  gate?: string;
  class?: string;
  departureTime?: string;
  arrivalTime?: string;
}): string {
  const now = new Date().toLocaleString();
  const date = data.deliveryDate || new Date().toLocaleDateString();

  if (data.type === "package") {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt - ${data.trackingId || "N/A"}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',Arial,sans-serif;background:#f8fafc;padding:16px;color:#1e3a8a;}
.receipt{max-width:700px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
.header{background:#1e3a8a;padding:24px;display:flex;justify-content:space-between;align-items:center;color:#fff;flex-wrap:wrap;gap:16px;}
.header-left{display:flex;align-items:center;gap:12px;}
.header-icon{width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;}
.header h1{font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.2;}
.header h1 span{color:#60a5fa;}
.header .subtitle{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.3em;opacity:0.7;}
.tracking-box{text-align:right;}
.tracking-box .label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;opacity:0.7;}
.tracking-box .id{font-size:20px;font-weight:900;font-family:monospace;margin-top:4px;}
.body{padding:24px;}
.meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:8px;}
.meta .tagline{font-size:11px;color:#94a3b8;font-weight:600;font-style:italic;}
.meta .date{font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;}
.addresses{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;}
@media(max-width:500px){.addresses{grid-template-columns:1fr;}}
.address-section h3{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;}
.address-section h3::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;}
.shipper h3::before{background:#3b82f6;}
.consignee h3::before{background:#10b981;}
.address-section .name{font-size:16px;font-weight:900;color:#1e3a8a;margin-bottom:4px;}
.address-section .email{font-size:13px;font-weight:700;color:#3b82f6;margin-bottom:4px;}
.address-section .addr{font-size:13px;color:#64748b;line-height:1.5;}
.address-section img{margin-top:12px;width:80px;height:80px;border-radius:10px;object-fit:cover;border:2px solid #f1f5f9;}
.details-table{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:32px;}
.details-table table{width:100%;border-collapse:collapse;}
.details-table th{background:#f8fafc;padding:12px 16px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;text-align:left;border-bottom:1px solid #e2e8f0;}
.details-table td{padding:16px;border-bottom:1px solid #f1f5f9;}
.details-table .content-name{font-weight:900;color:#1e3a8a;margin-bottom:4px;}
.details-table .content-status{font-size:11px;color:#94a3b8;font-style:italic;}
.details-table .center{text-align:center;font-weight:700;color:#475569;}
.details-table .right{text-align:right;font-weight:900;color:#1e3a8a;font-size:20px;}
.summary{background:#f8fafc;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1px solid #e2e8f0;}
@media(max-width:500px){.summary{grid-template-columns:1fr;}}
.summary .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;margin-bottom:4px;}
.summary .value{font-weight:900;color:#1e3a8a;}
.summary .total{text-align:right;}
.summary .total .amount{font-size:32px;font-weight:900;color:#1e3a8a;letter-spacing:-1px;}
.payment-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;}
.payment-badge.paid{background:#d1fae5;color:#059669;}
.payment-badge.pending{background:#fef3c7;color:#d97706;}
.customs{margin-bottom:32px;background:#fffbeb;padding:20px;border-radius:12px;border:1px solid #fde68a;}
.customs h4{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#d97706;margin-bottom:12px;}
.customs-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.customs-item .label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.customs-item .val{font-size:13px;font-weight:700;color:#1e3a8a;word-break:break-all;background:#fff;padding:6px 10px;border-radius:8px;border:1px solid #fde68a;margin-top:4px;font-family:monospace;}
.footer-section{padding:24px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;}
.security{display:flex;align-items:flex-start;gap:12px;max-width:60%;}
.security-icon{width:36px;height:36px;border-radius:50%;background:#f0f9ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #e2e8f0;font-size:16px;}
.security .label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.security .desc{font-size:9px;color:#64748b;line-height:1.5;margin-top:4px;}
.signature{text-align:right;}
.signature-line{display:inline-block;border-bottom:2px solid #e2e8f0;padding:0 32px 8px;position:relative;margin-bottom:8px;}
.signature-line .name{position:absolute;top:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-family:'Dancing Script',cursive;font-size:18px;color:#1e3a8a;}
.signature .label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.signature .dept{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#cbd5e1;margin-top:4px;}
.copyright{padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;font-size:8px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.2em;}
@media print{
  body{padding:0;background:#fff;}
  .receipt{box-shadow:none;border-radius:0;}
  .no-print{display:none;}
}
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="header-left">
      <div class="header-icon">&#128666;</div>
      <div>
        <h1>Diplomatic <span>Xpress</span></h1>
        <div class="subtitle">Logistics & Courier</div>
      </div>
    </div>
    <div class="tracking-box">
      <div class="label">Tracking Number</div>
      <div class="id">${data.trackingId || "---"}</div>
    </div>
  </div>
  <div class="body">
    <div class="meta">
      <div class="tagline">Official Consignment Receipt &mdash; "Global reach, local touch."</div>
      <div class="date">Date: ${date}</div>
    </div>
    <div class="addresses">
      <div class="address-section shipper">
        <h3>Shipper Details</h3>
        <div class="name">${data.senderName || "---"}</div>
        <div class="addr">${data.senderAddress || "---"}</div>
      </div>
      <div class="address-section consignee">
        <h3>Consignee Details</h3>
        <div class="name">${data.receiverName || "---"}</div>
        ${data.receiverEmail ? `<div class="email">${data.receiverEmail}</div>` : ""}
        <div class="addr">${data.receiverAddress || "---"}</div>
        ${data.ownerPhotoUrl ? `<img src="${data.ownerPhotoUrl}" alt="Owner" referrerpolicy="no-referrer" crossorigin="anonymous">` : ""}
      </div>
    </div>
    <div class="details-table">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center">Origin</th>
            <th style="text-align:center">Weight</th>
            <th style="text-align:right">Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="content-name">${data.content || "General Cargo"}</div>
              <div class="content-status">Status: ${data.action || "In Transit"}</div>
            </td>
            <td class="center">${data.origin || "---"}</td>
            <td class="center">${data.weight || "---"}</td>
            <td class="right">${data.quantity || "1"}</td>
          </tr>
        </tbody>
      </table>
      <div class="summary">
        <div>
          <div style="margin-bottom:12px">
            <div class="label">Payment Status</div>
            <span class="payment-badge ${data.paymentStatus === 'PAID' ? 'paid' : 'pending'}">${data.paymentStatus || "PENDING"}</span>
          </div>
          <div>
            <div class="label">Est. Delivery</div>
            <div class="value">${data.estDelivery || "---"}</div>
          </div>
        </div>
        <div class="total">
          <div class="label">Total Shipping Fee</div>
          <div class="amount">${data.shippingFee || "---"}</div>
        </div>
      </div>
    </div>
    ${data.action && data.action.toLowerCase().includes('custom') && data.paymentMethods && data.paymentMethods.length > 0 ? `
    <div class="customs">
      <h4>&#128737; Required Payment Methods for Customs Clearance</h4>
      <div class="customs-grid">
        ${data.paymentMethods.map(pm => `
          <div class="customs-item">
            <div class="label">${pm.name}</div>
            <div class="val">${pm.details}</div>
          </div>
        `).join("")}
      </div>
    </div>` : ""}
  </div>
  <div class="footer-section">
    <div class="security">
      <div class="security-icon">&#128737;</div>
      <div>
        <div class="label">Security Verification</div>
        <div class="desc">This document is digitally signed and verified by Diplomatic Xpress Logistics. Any alteration is prohibited.</div>
      </div>
    </div>
    <div class="signature">
      <div class="signature-line">
        <span class="name">Diplomatic Xpress</span>
      </div>
      <div class="label">Authorized Signature</div>
      <div class="dept">Logistics Operations Dept.</div>
    </div>
  </div>
  <div class="copyright">
    <span>&copy; ${new Date().getFullYear()} Diplomatic Xpress Logistics. All rights reserved.</span>
    <span>Generated: ${now}</span>
  </div>
</div>
</body></html>`;
  }

  // Flight receipt
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>E-Ticket - ${data.flightNumber || "N/A"}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',Arial,sans-serif;background:#f8fafc;padding:16px;color:#1e3a8a;}
.ticket{max-width:700px;margin:0 auto;background:#fff;border:4px solid #1e3a8a;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
.top{background:#1e3a8a;padding:20px 24px;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.top-left{display:flex;align-items:center;gap:10px;}
.top-left .icon{font-size:28px;}
.top-left h1{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.2;}
.top-left h1 span{color:#60a5fa;}
.top-left .sub{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;opacity:0.8;}
.top-right{text-align:right;}
.top-right .label{font-size:9px;font-weight:700;text-transform:uppercase;opacity:0.6;}
.top-right .num{font-size:22px;font-weight:900;letter-spacing:-1px;}
.content{padding:24px;}
.passenger-row{display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px;}
@media(max-width:500px){.passenger-row{grid-template-columns:1fr;}}
.passenger-row .label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.passenger-row .value{font-size:18px;font-weight:900;color:#1e3a8a;text-transform:uppercase;}
.route-box{background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;padding:24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;position:relative;overflow:hidden;}
.route-box::before{content:'';position:absolute;left:0;top:0;width:4px;height:100%;background:#1e3a8a;}
.route-box .city{font-size:28px;font-weight:900;color:#1e3a8a;letter-spacing:-1px;}
.route-box .name{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;margin-top:4px;}
.route-box .middle{flex:1;padding:0 16px;text-align:center;}
.route-box .dashes{display:flex;align-items:center;gap:4px;justify-content:center;}
.route-box .dot{width:8px;height:8px;border-radius:50%;background:#1e3a8a;}
.route-box .line{flex:1;border-top:2px dashed #d1d5db;}
.route-box .plane{font-size:16px;margin:0 4px;}
.route-box .duration{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;margin-top:8px;}
.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #f1f5f9;}
@media(max-width:500px){.info-grid{grid-template-columns:repeat(2,1fr);}}
.info-grid .label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.info-grid .val{font-size:16px;font-weight:900;color:#1e3a8a;margin-top:4px;}
.bottom-row{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;}
.qr-box{display:flex;align-items:center;gap:12px;}
.qr{background:#f8fafc;padding:8px;border-radius:8px;border:1px solid #e2e8f0;font-size:48px;}
.qr-labels .label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.qr-labels .val{font-weight:900;color:#1e3a8a;}
.valid-badge{display:flex;align-items:center;gap:6px;background:#ecfdf5;color:#059669;padding:8px 16px;border-radius:24px;border:1px solid #d1fae5;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;}
.footer-section{padding:20px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;}
.security{display:flex;align-items:flex-start;gap:10px;max-width:60%;}
.security-icon{width:36px;height:36px;border-radius:50%;background:#f0f9ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #e2e8f0;font-size:14px;}
.security .label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.security .desc{font-size:9px;color:#64748b;line-height:1.5;margin-top:4px;}
.signature{text-align:right;}
.signature-line{display:inline-block;border-bottom:2px solid #e2e8f0;padding:0 32px 8px;position:relative;margin-bottom:8px;}
.signature-line .name{position:absolute;top:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-family:'Dancing Script',cursive;font-size:18px;color:#1e3a8a;}
.signature .label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#94a3b8;}
.signature .dept{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#cbd5e1;margin-top:4px;}
.copyright{padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;font-size:8px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.2em;}
@media print{
  body{padding:0;background:#fff;}
  .ticket{box-shadow:none;border-radius:0;}
}
</style>
</head>
<body>
<div class="ticket">
  <div class="top">
    <div class="top-left">
      <span class="icon">&#9992;</span>
      <div>
        <h1>Diplomatic <span>Xpress</span> Airways</h1>
        <div class="sub">Boarding Pass & E-Ticket</div>
      </div>
    </div>
    <div class="top-right">
      <div class="label">Flight Number</div>
      <div class="num">${data.flightNumber || "---"}</div>
    </div>
  </div>
  <div class="content">
    <div class="passenger-row">
      <div>
        <div class="label">Passenger Name</div>
        <div class="value">${data.receiverName || "---"}</div>
      </div>
      <div style="text-align:right">
        <div class="label">Date</div>
        <div class="value">${date}</div>
      </div>
    </div>
    <div class="route-box">
      <div>
        <div class="city">${data.origin || "---"}</div>
        <div class="name">${data.origin || "Origin"}</div>
      </div>
      <div class="middle">
        <div class="dashes">
          <div class="dot"></div>
          <div class="line"></div>
          <span class="plane">&#9992;</span>
          <div class="line"></div>
          <div class="dot" style="border:2px solid #1e3a8a;background:transparent;"></div>
        </div>
        <div class="duration">Flight Duration: ---</div>
      </div>
      <div style="text-align:right">
        <div class="city">${data.destination || "---"}</div>
        <div class="name">${data.destination || "Destination"}</div>
      </div>
    </div>
    <div class="info-grid">
      <div><div class="label">Gate</div><div class="val">${data.gate || "TBA"}</div></div>
      <div><div class="label">Boarding</div><div class="val">---</div></div>
      <div><div class="label">Seat</div><div class="val">${data.seatNumber || "---"}</div></div>
      <div><div class="label">Class</div><div class="val" style="text-transform:uppercase">${data.class || "Economy"}</div></div>
    </div>
    <div class="bottom-row">
      <div class="qr-box">
        <div class="qr">&#9641;&#9641;<br>&#9641;&#9641;</div>
        <div class="qr-labels">
          <div class="label">Booking Ref: ${data.trackingId || "---"}</div>
          <div class="val">Price: ${data.shippingFee || "---"}</div>
        </div>
      </div>
      <div class="valid-badge">&#128737; Valid for Travel &bull; Non-Transferable</div>
    </div>
  </div>
  <div class="footer-section">
    <div class="security">
      <div class="security-icon">&#128737;</div>
      <div>
        <div class="label">Security Verification</div>
        <div class="desc">This document is digitally signed and verified by Diplomatic Xpress Logistics. Any alteration is prohibited.</div>
      </div>
    </div>
    <div class="signature">
      <div class="signature-line">
        <span class="name">Diplomatic Xpress</span>
      </div>
      <div class="label">Authorized Signature</div>
      <div class="dept">Logistics Operations Dept.</div>
    </div>
  </div>
  <div class="copyright">
    <span>&copy; ${new Date().getFullYear()} Diplomatic Xpress Logistics. All rights reserved.</span>
    <span>Generated: ${now}</span>
  </div>
</div>
</body></html>`;
}

export function openReceiptWindow(html: string, title: string = "Receipt") {
  const receiptWindow = window.open("", "_blank");
  if (receiptWindow) {
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    return true;
  }
  return false;
}

export function downloadReceipt(html: string, filename: string = "receipt.html") {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
