# CaratFlow Admin Guide

This guide is for tenant administrators -- the people who configure CaratFlow
for a single jewelry business. It covers user / role management, GST setup,
metal rate maintenance, and the other settings you touch when onboarding a
new shop.

> For day-to-day staff workflows (POS, old gold, Z-report) see the
> [User Guide](./user-guide.md).
> For server / infrastructure administration see
> [Deployment](./deployment.md).

---

## 1. Logging in as tenant admin

A tenant admin is any user with the `TENANT_ADMIN` role. The tenant owner
created at signup automatically has this role and can grant it to others.

1. Visit `https://<your-shop>.caratflow.app/admin` (or the regular dashboard
   if your tenant uses a single login).
2. Sign in. The **Settings** sidebar entry is visible only to admins.

---

## 2. Creating a user

1. Go to **Settings -> Users**.
2. Click **+ Add User**.
3. Fill in:
   - Full name
   - Email (this is the login id; must be unique within the tenant)
   - Phone (optional, used for SMS OTP if enabled)
   - Default store
4. Choose how to set the password:
   - **Send invite email** -- the user receives a one-time link to set their
     own password. Recommended.
   - **Set manually** -- type a temporary password they must change at first
     login.
5. Save.

The user is created in `INVITED` state until they accept. You can resend the
invite from the user row at any time.

> Email delivery requires SMTP to be configured at the platform level. If your
> deployment does not have SMTP, set the password manually.

---

## 3. Assigning a role

CaratFlow ships with a fixed set of base roles. You can also create custom
roles with fine-grained permissions.

| Built-in role     | Typical user                    | Key permissions                          |
|-------------------|---------------------------------|------------------------------------------|
| `TENANT_ADMIN`    | Owner, IT manager               | All settings + all data                  |
| `STORE_MANAGER`   | Store in-charge                 | All operations within their store        |
| `CASHIER`         | POS staff                       | Open / close session, sell, refund       |
| `ACCOUNTANT`      | Bookkeeper                      | Finance + reports, no stock writes       |
| `INVENTORY_CLERK` | Stock keeper                    | Receive, transfer, stock-take            |
| `KARIGAR_MANAGER` | Workshop supervisor             | Job cards, issue / receive gold          |
| `READ_ONLY`       | Auditor                         | Read-only across the tenant              |

To assign:

1. **Settings -> Users -> click the user**.
2. Open the **Roles** tab.
3. Tick one or more roles. You can scope a role to a specific store -- e.g.
   `CASHIER @ Andheri Branch`.
4. Save. The change takes effect on the user's next request (no logout
   required because roles are re-fetched per request).

### Custom roles

1. **Settings -> Roles -> + New Role**.
2. Give it a name (`SENIOR_CASHIER`).
3. Tick the permissions from the catalog. Permissions are grouped by module
   (`retail.sale.create`, `inventory.stock.read`, ...).
4. Save and assign to users like any built-in role.

---

## 4. Configuring GST

CaratFlow uses the same Indian GST rules across all jewelry tenants but each
tenant must enter its own GSTIN and place of business.

### 4.1 Tenant-level GST

1. **Settings -> Tax -> GST**.
2. Enter:
   - **GSTIN** (15 chars).
   - **Legal name** (must match GSTIN).
   - **State** (drives CGST + SGST vs IGST split).
   - **Composition scheme?** (off by default).
3. Save.

### 4.2 Tax rates

Rates for jewelry are pre-seeded:

| Category                  | HSN  | Rate |
|---------------------------|------|------|
| Gold jewelry              | 7113 | 3%   |
| Silver jewelry            | 7113 | 3%   |
| Loose diamonds            | 7102 | 0.25%|
| Making charges            | 9988 | 5%   |

You can override a rate per HSN under **Settings -> Tax -> HSN Rates** if your
auditor requires a different code. Changes take effect for new bills only;
historical bills keep the rate that applied at the time of issue.

### 4.3 E-invoice and e-way bill

If your turnover crosses the e-invoice threshold (currently Rs. 5 crore):

1. **Settings -> Tax -> E-Invoice** -> tick **Enabled**.
2. Upload your IRP (Invoice Registration Portal) credentials. They are
   encrypted at rest.
3. Test with a sample invoice.

E-way bill is configured in the same screen and is triggered automatically
on stock transfers above Rs. 50,000.

---

## 5. Setting metal rates

Metal rates drive every sale, repair, and old-gold buy-back. You can update
them manually each morning or hook up a live feed.

### 5.1 Manual update

1. **Settings -> Metal Rates**.
2. For each metal / purity row enter:
   - **Sale rate** (Rs. per gram of fine metal)
   - **Buy-back rate** (Rs. per gram of fine metal)
3. Click **Apply**. The rate becomes effective immediately for new bills.

CaratFlow stores rates with timestamps so historical bills always reprice at
the rate that was in force at the time of the sale.

### 5.2 Automated rate feed

If your deployment has the `RATE_API_URL` env var configured (see
[Deployment](./deployment.md)), CaratFlow polls the upstream feed every 5
minutes. You can:

- Toggle "Auto-update sale rate" per metal/purity row.
- Set a **markup %** that is applied to the upstream rate before it hits the
  POS.
- Lock a rate manually for the rest of the day.

A history chart at the bottom of the page shows intraday movement.

---

## 6. Stores, terminals, printers

A tenant can have many stores; each store can have many POS terminals.

1. **Settings -> Stores -> + New Store**.
2. Capture address, GST place of business, contact phone, and the financial
   year start (defaults to 1 April).
3. Open the store -> **Terminals** tab -> **+ Terminal**.
4. Each terminal can be linked to:
   - A receipt printer (network or USB via the print agent).
   - A cash drawer.
   - A barcode / RFID scanner.
   - A weighing scale (serial / USB HID).
   - A customer-facing display.

The hardware module ([W4-INTEG](../IMPLEMENTATION-PLAN.md)) handles the actual
device drivers; the admin screen is just where you bind a logical terminal to
a hardware id.

---

## 7. Other admin checklists

### New tenant onboarding

- [ ] Tenant slug + branding (logo, colors).
- [ ] At least one store + one terminal.
- [ ] Tenant admin user + one cashier user.
- [ ] GSTIN + state + e-invoice settings.
- [ ] Opening metal rates.
- [ ] Opening stock import (CSV or API).
- [ ] Chart of accounts -- start from the seeded jewelry COA and edit.
- [ ] Hallmarking centre details (BIS rules).
- [ ] SMTP / SMS gateway for notifications.
- [ ] Test sale + test return + test Z-report.

### Monthly housekeeping

- [ ] Reconcile bank statements in **Finance -> Bank**.
- [ ] Run **Reports -> GSTR-1 / GSTR-3B** and download the JSON for filing.
- [ ] Stock-take on at least one bin (target full coverage every quarter).
- [ ] Review **Settings -> Audit Log** for anything unusual.
- [ ] Verify backups (see deployment guide).

---

## 8. Where to look when something is wrong

| Symptom                              | Where to check                              |
|--------------------------------------|---------------------------------------------|
| User can't log in                    | Settings -> Users -> status, then Audit Log |
| Wrong tax on a bill                  | Settings -> Tax -> HSN Rates effective date |
| Stock count mismatch                 | Inventory -> Movements -> filter by SKU     |
| GSTR mismatch                        | Reports -> GST -> Reconciliation            |
| POS won't open session               | Settings -> Stores -> Terminal status       |
| Karigar gold balance off             | Manufacturing -> Karigar Ledger             |

If you can't find the issue, raise a support ticket from **Support -> New
Ticket** with the affected bill / user / SKU id and CaratFlow support will
trace it.
