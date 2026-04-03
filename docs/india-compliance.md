# CaratFlow India Compliance Guide

## GST for Jewelry

### Rates

| Item                    | HSN Code | GST Rate | CGST  | SGST  | IGST  |
|------------------------|----------|----------|-------|-------|-------|
| Gold jewelry           | 7113     | 3%       | 1.5%  | 1.5%  | 3%    |
| Silver jewelry         | 7113     | 3%       | 1.5%  | 1.5%  | 3%    |
| Platinum jewelry       | 7113     | 3%       | 1.5%  | 1.5%  | 3%    |
| Gold (bullion/bars)    | 7108     | 3%       | 1.5%  | 1.5%  | 3%    |
| Silver (bullion/bars)  | 7106     | 3%       | 1.5%  | 1.5%  | 3%    |
| Diamonds               | 7102     | 3%       | 1.5%  | 1.5%  | 3%    |
| Precious stones        | 7103     | 3%       | 1.5%  | 1.5%  | 3%    |
| Making charges         | 9988     | 5%       | 2.5%  | 2.5%  | 5%    |
| Imitation jewelry      | 7117     | 3%       | 1.5%  | 1.5%  | 3%    |

### Intra-state vs. Inter-state

- **Intra-state** (buyer and seller in same state): CGST + SGST
- **Inter-state** (buyer and seller in different states): IGST
- State is determined by the seller's location and the buyer's billing address

### HSN Codes Commonly Used

| Code | Description                              |
|------|------------------------------------------|
| 7101 | Pearls (natural or cultured)             |
| 7102 | Diamonds (worked or unworked)            |
| 7103 | Precious stones other than diamonds      |
| 7106 | Silver (unwrought, semi-manufactured)    |
| 7108 | Gold (unwrought, semi-manufactured)      |
| 7110 | Platinum (unwrought)                     |
| 7113 | Articles of jewelry and parts thereof    |
| 7114 | Articles of goldsmiths or silversmiths   |
| 7115 | Other articles of precious metal         |
| 7116 | Articles of natural/cultured pearls      |

### GST Computation in CaratFlow

GST is calculated using `IndianGstCalculator` from `@caratflow/utils`. The rate is stored as an integer multiplied by 100 (e.g., 3% = 300) to avoid floating-point issues. The computation flow:

1. Determine taxable amount (item price - discounts)
2. Look up GST rate by HSN code
3. Check if intra-state or inter-state
4. Compute CGST/SGST (half-rate each) or IGST (full rate)
5. Store tax components separately in `tax_transactions` table

## HUID (Hallmark Unique Identification)

### Overview

HUID is a 6-character alphanumeric code assigned by the Bureau of Indian Standards (BIS) to every piece of hallmarked jewelry. It is mandatory for gold jewelry sold in India.

### Requirements

- Every piece of gold jewelry (14K, 18K, 20K, 22K, 24K) must carry a HUID
- The HUID must be engraved/stamped on the article
- Jewelers must register with BIS and use authorized Assaying and Hallmarking Centres (AHC)
- HUID must be recorded at the time of sale and linked to the customer

### CaratFlow Implementation

- HUID is stored as a field on product/stock records
- HUID is validated using `isValidHuid()` from `@caratflow/utils` (6 alphanumeric chars)
- Sales records link the HUID to the customer for traceability
- The compliance module tracks HUID registration and verification status

## BIS Hallmarking Process

1. **Jeweler registers with BIS** and obtains a license
2. **Articles are submitted** to an authorized AHC for testing
3. **AHC tests purity** and stamps the hallmark (BIS logo, purity, AHC mark, HUID)
4. **HUID is recorded** in the BIS portal
5. **Article is sold** with HUID linked to the customer in the POS system
6. **Consumer can verify** HUID via the BIS Care app

### Hallmark Components

- BIS Standard Mark (triangle)
- Purity/Fineness grade (e.g., 22K916)
- AHC identification mark
- HUID (6-character alphanumeric)

## TDS (Section 194Q) - Tax Deducted at Source

### Rules

- Applies to **purchase of goods** exceeding Rs. 50 lakh in a financial year
- The **buyer** deducts TDS on the amount exceeding Rs. 50 lakh
- Rate: **0.1%** if seller has PAN, **5%** if seller has no PAN
- Applicable from 1st July 2021

### CaratFlow Implementation

- `TdsCalculator` in `@caratflow/utils` handles threshold tracking and rate computation
- Cumulative purchase amount per supplier is tracked per financial year
- TDS is automatically computed when the threshold is exceeded
- TDS certificate generation is tracked in the compliance module

### Example

```
Supplier: ABC Gold Pvt Ltd
FY cumulative purchases: Rs 55,00,000 (exceeded 50L threshold)
Current purchase: Rs 10,00,000

TDS = 0.1% of Rs 10,00,000 = Rs 1,000
Net payment = Rs 9,99,000
```

## TCS (Section 206C) - Tax Collected at Source

### Rules

- Applies to **sale of goods** exceeding Rs. 50 lakh in a financial year
- The **seller** collects TCS on the amount exceeding Rs. 50 lakh
- Rate: **0.1%** if buyer has PAN, **1%** if buyer has no PAN
- Applicable from 1st October 2020

### CaratFlow Implementation

- `TcsCalculator` in `@caratflow/utils` handles threshold tracking
- Cumulative sale amount per buyer is tracked per financial year
- TCS is automatically added to the invoice when the threshold is exceeded

## Girvi / Money Lending Regulations

### Overview

Girvi (pledged gold loan) is a common practice in Indian jewelry stores where customers pledge gold items as collateral for a loan.

### Key Regulations

- Must comply with state money lending acts
- Interest rate caps vary by state
- Proper documentation of pledged items (weight, purity, description)
- Auction rules: typically after 1 year of non-payment, with proper notice
- KYC verification required for loans above prescribed limits

### CaratFlow Implementation

- Girvi module tracks pledged items, loan amounts, interest, and status
- Interest calculation based on configurable rates
- Automated reminders for due dates
- Auction workflow with regulatory notice periods

## KYC Requirements

### When KYC is Required

- Cash transactions exceeding Rs. 2 lakh
- All Girvi/gold loan transactions
- Opening of customer accounts

### Required Documents

| Document | Format                           | Validation                    |
|----------|----------------------------------|-------------------------------|
| PAN      | AAAPL1234C (10 chars)            | `isValidPan()` with format check |
| Aadhaar  | 12 digits (XXXX XXXX XXXX)      | `isValidAadhaar()` with Verhoeff checksum |
| GSTIN    | 15 chars (e.g., 27AABCS1429B1Z5) | `isValidGstin()` with state + PAN check |

### CaratFlow Implementation

- Validators in `@caratflow/utils` verify document formats
- PAN entity type extraction (Individual, Company, HUF, etc.)
- GSTIN state code extraction for GST computation
- Aadhaar verification uses Verhoeff checksum algorithm

## E-Invoicing Requirements

### Applicability

- E-invoicing is mandatory for businesses with turnover exceeding Rs. 5 crore
- Applies to B2B invoices, exports, and supplies to SEZ
- Does not apply to B2C retail invoices (but recommended)

### Process

1. Generate invoice in CaratFlow
2. Convert to e-invoice JSON format (Schema version 1.1)
3. Upload to Invoice Registration Portal (IRP)
4. IRP returns IRN (Invoice Reference Number) and QR code
5. Store IRN and QR on the invoice record
6. Print invoice with QR code

### CaratFlow Implementation

- Invoice data is structured to comply with e-invoice schema
- The compliance module handles IRP integration
- IRN and QR code are stored on invoice records
- Bulk upload support for high-volume periods

## Financial Year Reference

| Country | FY Start | FY End   | Example                |
|---------|----------|----------|------------------------|
| India   | April 1  | March 31 | FY 2025-26 (Apr 2025 - Mar 2026) |
| US      | Jan 1    | Dec 31   | FY 2026                |
| UK      | April 6  | April 5  | FY 2025-26             |
| UAE     | Jan 1    | Dec 31   | FY 2026                |

CaratFlow's `getFinancialYear()` utility handles FY computation for any supported country.
