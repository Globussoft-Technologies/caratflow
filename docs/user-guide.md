# CaratFlow User Guide

A walkthrough for the staff who run a jewelry shop on CaratFlow. This guide
follows a typical retail day from open to close and covers the screens you will
touch most often. Screenshots are placeholders -- swap them in once your tenant
is branded.

> Audience: shop staff, cashiers, sales associates, accountants.
> For tenant-admin tasks (creating users, GST setup, metal rates) see the
> [Admin Guide](./admin-guide.md).

---

## 1. Logging in

1. Open `https://<your-shop>.caratflow.app` in a desktop browser.
2. Enter your work email and password.
3. Pick the store you are working from if you have access to more than one.

> Forgotten passwords are reset by your tenant admin -- there is a "Forgot
> password" link on the login screen that emails a reset token if SMTP is
> configured.

![Login screen](./screenshots/login.png)

---

## 2. Opening a POS session

Every cashier must open a session before ringing up sales. Sessions track the
opening cash float, the cashier, the terminal, and produce the end-of-day
Z-report.

1. Navigate to **Retail -> POS** in the sidebar.
2. Click **Open Session**.
3. Enter the **opening cash float** (the physical cash you have in the drawer).
4. Confirm the **terminal** and **store**.
5. Click **Open**. The POS screen unlocks.

![Open session](./screenshots/open-session.png)

The header now shows your session id, the opening time, and a running tally of
sales.

---

## 3. Making a sale

The POS supports walk-in customers and registered customers. Use a registered
customer record whenever you can -- it feeds CRM, loyalty, and BIS hallmarking
declarations.

### 3.1 Pick the customer

- Click **Customer** -> search by name or phone -> select.
- Or click **+ New Customer** to add one on the spot. Name and phone are
  enough for a walk-in; PAN is required if the bill total exceeds the KYC
  threshold (currently Rs. 2,00,000).

### 3.2 Add line items

You can add items three ways:

| Method        | When to use                                        |
|---------------|----------------------------------------------------|
| Scan barcode  | Tagged stock with QR / barcode labels              |
| RFID tray     | Bulk read with an RFID reader                      |
| SKU search    | Untagged or one-off pieces                         |

For each line you can override:

- **Metal rate** per gram (defaults to the daily rate set by the admin).
- **Making charges** (% or per gram or flat).
- **Stone value** if the line includes diamond / gemstones.
- **Wastage %** for traditional pricing.

The right-hand panel updates the bill in real time:

```
Gold value         Rs. 1,42,500
Stone value        Rs.    8,200
Making charges     Rs.   12,000
GST 3%             Rs.    4,881
-------------------------------
Grand total        Rs. 1,67,581
```

![POS sale](./screenshots/pos-sale.png)

### 3.3 Take payment

Click **Pay**. The payment dialog supports split tenders:

- Cash
- Card (manual or integrated terminal)
- UPI
- Bank transfer
- Layaway / advance adjustment
- Loyalty points
- Old gold (see next section)

Tap **Confirm**. CaratFlow:

1. Posts the sale to the financial ledger.
2. Decrements stock and writes a stock movement.
3. Generates the GST tax invoice (PDF).
4. Optionally prints the invoice and opens the cash drawer.

---

## 4. Accepting old gold (exchange)

Old gold is purchased from the customer at a per-gram rate, then either
adjusted against a new sale or paid out separately.

1. From the POS, click **Old Gold** in the side actions.
2. Weigh each piece on the connected scale (or enter the weight manually).
3. Enter the **assessed purity** -- 22K, 18K, etc. CaratFlow converts to fine
   gold for the buy-back calculation.
4. Set the **buy-back rate** per gram of fine gold (defaults to today's
   buy-back rate from settings).
5. Save. The total credit appears at the bottom of the dialog.

You can now:

- **Adjust against a new sale** -- click "Apply to current bill". The credit
  becomes a payment line on the active sale.
- **Pay out** -- click "Pay out" to issue cash / bank transfer for the credit.
  This creates an old-gold purchase voucher.

> The accepted pieces enter the **scrap** stock bucket. They become eligible for
> melting once the manufacturing module picks them up.

![Old gold dialog](./screenshots/old-gold.png)

---

## 5. Custom orders, layaway, repairs

Each of these has its own tab inside **Retail**. The pattern is the same:

- **Custom Order**: capture sketch, customer-supplied gold, target weight,
  delivery date. Track status from `DRAFT` -> `IN_PRODUCTION` -> `READY` ->
  `DELIVERED`.
- **Layaway**: take a deposit on a piece, hold it from sale, accept further
  installments until paid off, then convert to a sale.
- **Repair Job**: log incoming repair, photograph the piece, estimate cost,
  hand to the workshop, return to customer.

All three feed the same CRM contact card so the customer's history shows
sales, repairs, and pending work in one place.

---

## 6. End-of-day Z-report

Before the cashier leaves, close the POS session.

1. Go to **Retail -> POS** -> click **Close Session**.
2. CaratFlow shows the **expected** drawer total based on all cash sales.
3. Count the physical drawer and enter the **actual** total.
4. Note any variance (over / short).
5. Click **Close & Print Z-report**.

The Z-report is a PDF you can print or download. It includes:

- Total sales by tender (cash, card, UPI, ...).
- Discounts and returns for the session.
- GST collected (CGST / SGST / IGST split).
- Number of bills, average bill value.
- Drawer count vs expected, variance.
- Cashier and supervisor signature lines.

![Z report](./screenshots/z-report.png)

After closing, the drawer cash should be deposited per shop policy (safe,
bank drop, etc). The sale data flows to:

- **Reports -> Daily Sales** for the manager dashboard.
- **Finance -> Day Book** for accounting.
- **CRM -> Customer 360** for customer history.

---

## 7. Other daily tasks at a glance

| Task                     | Where in the app                  |
|--------------------------|-----------------------------------|
| Receive stock from vendor| Inventory -> Receipts             |
| Transfer to another store| Inventory -> Transfers            |
| Issue gold to karigar    | Manufacturing -> Job Cards        |
| Update today's metal rate| Settings -> Metal Rates           |
| Apply a discount         | POS line / bill -> Discount icon  |
| Process a return         | Retail -> Returns -> New Return   |
| Loyalty point redemption | POS payment dialog -> Loyalty     |
| Search a piece by barcode| Top header search bar             |

---

## 8. Getting help

- In-app help: click the **?** icon in the header for context-sensitive tips.
- Knowledge base: `https://help.caratflow.app`
- Raise a ticket: **Support -> New Ticket** in the dashboard.
