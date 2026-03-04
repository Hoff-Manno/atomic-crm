import type { Company, Contact, Deal, PaymentScheduleItem } from "../types";

interface ContractData {
  deal: Deal;
  company?: Company;
  contacts: Contact[];
  schedule: PaymentScheduleItem[];
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
  });

const formatDate = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function generateContractHtml(data: ContractData): string {
  const { deal, company, contacts, schedule } = data;
  const contractNumber = `LD-${String(deal.id).padStart(5, "0")}`;
  const today = new Date().toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const customerLines = contacts
    .map((c) => {
      const phone = c.phone_jsonb?.[0]?.number ?? "";
      const email = c.email_jsonb?.[0]?.email ?? "";
      return `
        <tr>
          <td>${c.first_name} ${c.last_name}</td>
          <td>${phone}</td>
          <td>${email}</td>
        </tr>`;
    })
    .join("");

  const scheduleRows = schedule
    .map(
      (item) => `
        <tr>
          <td>${item.installment_number === 0 ? "Deposit" : item.installment_number}</td>
          <td>${formatDate(item.due_date)}</td>
          <td class="amount">${formatCurrency(item.amount)}</td>
          <td class="status-cell">${item.status === "paid" ? "✓ Paid" : item.status === "partial" ? "◐ Partial" : ""}</td>
        </tr>`,
    )
    .join("");

  const remaining = deal.amount - (deal.total_paid ?? 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Layby Contract ${contractNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 20mm 15mm;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22pt;
      letter-spacing: 2px;
      margin-bottom: 2px;
    }
    .header p {
      font-size: 9pt;
      color: #666;
    }
    .contract-number {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      font-size: 10pt;
    }
    .contract-number strong { font-size: 12pt; }
    h2 {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin: 16px 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    th, td {
      text-align: left;
      padding: 4px 8px;
      border: 1px solid #ddd;
      font-size: 10pt;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
    }
    .amount { text-align: right; }
    .status-cell { text-align: center; font-size: 9pt; }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      margin-bottom: 12px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px dotted #ccc;
    }
    .summary-item .label { font-size: 10pt; color: #555; }
    .summary-item .value { font-weight: 600; }
    .terms {
      font-size: 8.5pt;
      line-height: 1.6;
      color: #333;
    }
    .terms ol { padding-left: 18px; }
    .terms li { margin-bottom: 6px; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-block { border-top: 1px solid #1a1a1a; padding-top: 4px; }
    .sig-block .sig-line {
      height: 50px;
      border-bottom: 1px solid #999;
      margin-bottom: 4px;
    }
    .sig-block .sig-label { font-size: 9pt; color: #666; }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 8px;
    }
    @media print {
      body { padding: 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:16px">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#f8f8f8">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <h1>LAYAWAY DEPOT NZ</h1>
    <p>Layby Agreement</p>
  </div>

  <div class="contract-number">
    <div><strong>Contract: ${contractNumber}</strong></div>
    <div>Date: ${today}</div>
  </div>

  <h2>Contract Details</h2>
  <div class="summary-grid">
    <div class="summary-item">
      <span class="label">Contract Name</span>
      <span class="value">${escapeHtml(deal.name)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Supplier</span>
      <span class="value">${escapeHtml(company?.name ?? "—")}</span>
    </div>
    <div class="summary-item">
      <span class="label">Item</span>
      <span class="value">${escapeHtml(deal.item_description ?? "—")}</span>
    </div>
    <div class="summary-item">
      <span class="label">Category</span>
      <span class="value">${escapeHtml(deal.category ?? "—")}</span>
    </div>
    <div class="summary-item">
      <span class="label">Held at</span>
      <span class="value">${escapeHtml(deal.item_held_location ?? "—")}</span>
    </div>
    <div class="summary-item">
      <span class="label">Status</span>
      <span class="value">${escapeHtml(deal.stage)}</span>
    </div>
  </div>

  <h2>Customer</h2>
  <table>
    <thead><tr><th>Name</th><th>Phone</th><th>Email</th></tr></thead>
    <tbody>
      ${customerLines || '<tr><td colspan="3">—</td></tr>'}
    </tbody>
  </table>

  <h2>Financial Summary</h2>
  <div class="summary-grid">
    <div class="summary-item">
      <span class="label">Total Price</span>
      <span class="value">${formatCurrency(deal.amount)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Deposit</span>
      <span class="value">${formatCurrency(deal.deposit_amount ?? 0)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Total Paid</span>
      <span class="value">${formatCurrency(deal.total_paid ?? 0)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Remaining Balance</span>
      <span class="value">${formatCurrency(remaining)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Payment Frequency</span>
      <span class="value">${capitalize(deal.payment_frequency ?? "weekly")}</span>
    </div>
    <div class="summary-item">
      <span class="label">Final Payment Date</span>
      <span class="value">${deal.expected_closing_date ? formatDate(deal.expected_closing_date) : "—"}</span>
    </div>
  </div>

  ${
    schedule.length > 0
      ? `
  <h2>Payment Schedule</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Due Date</th><th class="amount">Amount</th><th class="status-cell">Status</th></tr>
    </thead>
    <tbody>
      ${scheduleRows}
      <tr style="font-weight:600;background:#f5f5f5">
        <td colspan="2">Total</td>
        <td class="amount">${formatCurrency(schedule.reduce((s, i) => s + i.amount, 0))}</td>
        <td></td>
      </tr>
    </tbody>
  </table>`
      : ""
  }

  <h2>Terms &amp; Conditions</h2>
  <div class="terms">
    <ol>
      <li><strong>Ownership:</strong> The item(s) described above remain the property of Layaway Depot NZ until the total price has been paid in full and the item has been collected by the customer.</li>
      <li><strong>Payments:</strong> Payments must be made according to the schedule above. Payments may be made by cash, EFTPOS, bank transfer, or credit card.</li>
      <li><strong>Late Payments:</strong> If a scheduled payment is more than 14 days overdue, Layaway Depot NZ may contact the customer to arrange a revised payment plan. Persistent non-payment may result in cancellation of the layby.</li>
      <li><strong>Cancellation by Customer:</strong> The customer may cancel this layby at any time. In accordance with the Consumer Guarantees Act 1993 and Fair Trading Act 1986, a cancellation fee of up to 10% of the total price (or the actual costs incurred, whichever is less) may apply. The remaining balance of payments made will be refunded within 10 working days.</li>
      <li><strong>Cancellation by Layaway Depot NZ:</strong> If no payment is received for 30 consecutive days and the customer cannot be contacted after reasonable attempts, the layby may be cancelled. Refund terms as per clause 4 apply.</li>
      <li><strong>Storage &amp; Liability:</strong> Items on layby are stored at the customer's risk. Layaway Depot NZ will take reasonable care of stored items but is not liable for loss or damage caused by events beyond reasonable control (e.g., fire, flood, theft).</li>
      <li><strong>Collection:</strong> The customer (or an authorised person) must present valid photo identification and their receipt/contract number to collect the item. Items must be collected within 14 days of the final payment being made.</li>
      <li><strong>Collection Deadline:</strong>${deal.contract_end_date ? ` Items not collected by ${formatDate(deal.contract_end_date)} may be returned to stock.` : " As agreed between the parties."}</li>
      <li><strong>Disputes:</strong> Any disputes should be raised with Layaway Depot NZ management in the first instance. This agreement is governed by New Zealand law and the parties submit to the jurisdiction of the New Zealand courts and the Disputes Tribunal.</li>
      <li><strong>Privacy:</strong> Personal information is collected solely for the purpose of administering this layby agreement, in accordance with the Privacy Act 2020.</li>
    </ol>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Customer Signature</div>
      <div class="sig-line" style="height:30px"></div>
      <div class="sig-label">Print Name &amp; Date</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Layaway Depot NZ Staff Signature</div>
      <div class="sig-line" style="height:30px"></div>
      <div class="sig-label">Print Name &amp; Date</div>
    </div>
  </div>

  <div class="footer">
    Layaway Depot NZ &mdash; Contract ${contractNumber} &mdash; Generated ${today}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
