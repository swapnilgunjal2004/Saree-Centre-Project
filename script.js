const STORAGE_KEY = "shree_datta_saree_centre_records";

const form = document.getElementById("sale-form");
const paymentStatusInput = document.getElementById("paymentStatus");
const amountPaidInput = document.getElementById("amountPaid");
const unitsInput = document.getElementById("units");
const unitPriceInput = document.getElementById("unitPrice");
const dateInput = document.getElementById("saleDate");
const totalsBox = document.getElementById("totals");
const recordsTbody = document.querySelector("#records-table tbody");
const productSummaryTbody = document.querySelector("#product-summary-table tbody");
const clearBtn = document.getElementById("clear-data");
const downloadPdfBtn = document.getElementById("download-pdf");

let records = loadRecords();
let fallbackIdCounter = 0;
setDefaultDate();
renderAll();

paymentStatusInput.addEventListener("change", syncAmountPaidForPaidStatus);
unitsInput.addEventListener("input", syncAmountPaidForPaidStatus);
unitPriceInput.addEventListener("input", syncAmountPaidForPaidStatus);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const customerName = document.getElementById("customerName").value.trim();
  const productName = document.getElementById("productName").value.trim();
  const units = Number(unitsInput.value);
  const unitPrice = Number(unitPriceInput.value);
  const paymentStatus = paymentStatusInput.value;
  const saleDate = dateInput.value;

  const totalPrice = roundTo2(units * unitPrice);
  const rawPaid = Number(amountPaidInput.value);
  const amountPaid = Math.min(Math.max(rawPaid, 0), totalPrice);
  const remainingAmount = roundTo2(totalPrice - amountPaid);

  if (!customerName || !productName || !saleDate || units <= 0 || unitPrice <= 0) {
    alert("Please enter valid details.");
    return;
  }

  records.push({
    id: createRecordId(),
    saleDate,
    customerName,
    productName,
    units,
    unitPrice,
    totalPrice,
    paymentStatus: remainingAmount === 0 ? "Paid" : paymentStatus,
    amountPaid,
    remainingAmount,
  });

  saveRecords(records);
  form.reset();
  setDefaultDate();
  renderAll();
});

clearBtn.addEventListener("click", () => {
  if (!records.length) return;
  if (!confirm("Delete all records?")) return;
  records = [];
  saveRecords(records);
  renderAll();
});

downloadPdfBtn.addEventListener("click", () => {
  if (!records.length) {
    alert("No records available to export.");
    return;
  }

  const totals = calculateTotals(records);
  const productRows = Object.values(buildProductSummary(records));
  const popup = window.open("", "_blank", "width=1000,height=800");
  if (!popup) {
    alert("Please allow popups to export as PDF.");
    return;
  }

  popup.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Shree Datta Saree Centre - Sales Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 20px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin-bottom: 16px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th, td { border: 1px solid #bbb; padding: 6px; text-align: left; }
    th { background: #eee; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>Shree Datta Saree Centre - Sales Report</h1>
  <div class="meta">
    <div>Total Sales: ${formatCurrency(totals.totalSales)}</div>
    <div>Total Paid: ${formatCurrency(totals.totalPaid)}</div>
    <div>Total Remaining: ${formatCurrency(totals.totalRemaining)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Customer</th><th>Product</th><th>Units</th><th>Unit Price</th><th>Total</th><th>Status</th><th>Paid</th><th>Remaining</th>
      </tr>
    </thead>
    <tbody>
      ${records
        .map(
          (r) => `<tr>
        <td>${escapeHtml(r.saleDate)}</td>
        <td>${escapeHtml(r.customerName)}</td>
        <td>${escapeHtml(r.productName)}</td>
        <td>${r.units}</td>
        <td>${formatCurrency(r.unitPrice)}</td>
        <td>${formatCurrency(r.totalPrice)}</td>
        <td>${escapeHtml(r.paymentStatus)}</td>
        <td>${formatCurrency(r.amountPaid)}</td>
        <td>${formatCurrency(r.remainingAmount)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>
  <h2>Product-wise Sales</h2>
  <table>
    <thead>
      <tr><th>Product</th><th>Total Units Sold</th><th>Total Sales</th></tr>
    </thead>
    <tbody>
      ${productRows
        .map(
          (row) => `<tr>
        <td>${escapeHtml(row.productName)}</td>
        <td>${row.totalUnits}</td>
        <td>${formatCurrency(row.totalSales)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
  popup.document.close();
});

recordsTbody.addEventListener("click", (event) => {
  const deleteBtn = event.target.closest(".delete-record-btn");
  if (!deleteBtn) return;
  const { recordId } = deleteBtn.dataset;
  if (!recordId) return;
  records = records.filter((item) => item.id !== recordId);
  saveRecords(records);
  renderAll();
});

function renderAll() {
  renderTotals();
  renderRecordsTable();
  renderProductSummaryTable();
}

function renderTotals() {
  const totals = calculateTotals(records);
  totalsBox.innerHTML = `
    <div class="total-item"><strong>Total Records</strong><div>${records.length}</div></div>
    <div class="total-item"><strong>Total Sales</strong><div>${formatCurrency(totals.totalSales)}</div></div>
    <div class="total-item"><strong>Total Paid</strong><div>${formatCurrency(totals.totalPaid)}</div></div>
    <div class="total-item"><strong>Total Remaining</strong><div>${formatCurrency(totals.totalRemaining)}</div></div>
  `;
}

function renderRecordsTable() {
  if (!records.length) {
    recordsTbody.innerHTML = `<tr><td colspan="10">No records yet.</td></tr>`;
    return;
  }

  recordsTbody.innerHTML = records
    .map(
      (record) => `
      <tr>
        <td>${escapeHtml(record.saleDate)}</td>
        <td>${escapeHtml(record.customerName)}</td>
        <td>${escapeHtml(record.productName)}</td>
        <td>${record.units}</td>
        <td>${formatCurrency(record.unitPrice)}</td>
        <td>${formatCurrency(record.totalPrice)}</td>
        <td class="${record.paymentStatus === "Paid" ? "status-paid" : "status-unpaid"}">${record.paymentStatus}</td>
        <td>${formatCurrency(record.amountPaid)}</td>
        <td>${formatCurrency(record.remainingAmount)}</td>
        <td><button type="button" class="row-action delete-record-btn" data-record-id="${record.id}">Delete</button></td>
      </tr>
    `
    )
    .join("");
}

function renderProductSummaryTable() {
  const summary = buildProductSummary(records);
  const rows = Object.values(summary);

  if (!rows.length) {
    productSummaryTbody.innerHTML = `<tr><td colspan="3">No product data yet.</td></tr>`;
    return;
  }

  productSummaryTbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.productName)}</td>
        <td>${row.totalUnits}</td>
        <td>${formatCurrency(row.totalSales)}</td>
      </tr>
    `
    )
    .join("");
}

function calculateTotals(data) {
  return data.reduce(
    (acc, record) => {
      acc.totalSales += record.totalPrice;
      acc.totalPaid += record.amountPaid;
      acc.totalRemaining += record.remainingAmount;
      return acc;
    },
    { totalSales: 0, totalPaid: 0, totalRemaining: 0 }
  );
}

function buildProductSummary(data) {
  return data.reduce((acc, record) => {
    const key = record.productName.toLowerCase();
    if (!acc[key]) {
      acc[key] = { productName: toTitleCase(key), totalUnits: 0, totalSales: 0 };
    }
    acc[key].totalUnits += record.units;
    acc[key].totalSales += record.totalPrice;
    return acc;
  }, {});
}

function syncAmountPaidForPaidStatus() {
  const units = Number(unitsInput.value || 0);
  const unitPrice = Number(unitPriceInput.value || 0);
  const total = roundTo2(units * unitPrice);

  if (paymentStatusInput.value === "Paid") {
    amountPaidInput.value = total > 0 ? total : "";
    amountPaidInput.readOnly = true;
  } else {
    amountPaidInput.readOnly = false;
  }
}

function setDefaultDate() {
  dateInput.value = new Date().toISOString().split("T")[0];
  syncAmountPaidForPaidStatus();
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRecords(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatCurrency(value) {
  return `₹${Number(value).toFixed(2)}`;
}

function roundTo2(value) {
  return Number(value.toFixed(2));
}

function createRecordId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  const timestamp = Date.now();
  const highRes = typeof performance !== "undefined" ? Math.floor(performance.now() * 1000) : 0;
  const entropy = Math.floor(Math.random() * 1_000_000_000);
  return `id-${timestamp}-${highRes}-${fallbackIdCounter}-${entropy}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toTitleCase(text) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}
