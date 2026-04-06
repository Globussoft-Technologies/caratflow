# CaratFlow

**The complete jewelry ERP platform -- built for jewelers, by design.**

CaratFlow is a modern, multi-tenant jewelry ERP system covering the full lifecycle of a jewelry business: from raw metal procurement and manufacturing through retail sales and customer management. Purpose-built for Indian jewelers with worldwide support.

---

## Why CaratFlow?

The jewelry industry has unique requirements that generic ERP systems can't address: karat-wise metal tracking, karigar (artisan) management, tunch/wastage calculations, HUID compliance, girvi (mortgage lending), kitty/chit schemes, and complex pricing based on live metal rates. CaratFlow handles all of this natively.

---

## Features

### Core Inventory Management
- Real-time tracking for metals, stones, and finished goods
- Karat-wise / purity-based inventory with 5 valuation methods (FIFO, weighted average, last purchase, gross profit, market value)
- Batch/lot management for diamonds and gemstones
- Diamond tracking by 4Cs (Cut, Clarity, Color, Carat)
- Lab-grown diamond attribute handling
- Serialized item tracking with RFID, barcode, and QR code support
- Multi-location / multi-branch inventory with inter-location transfers
- Metal recovery tracking and calculations
- Stock take / physical audit workflow with variance detection

### Manufacturing & Production
- Multi-level Bill of Materials (BOM) engine with explosion
- Material Requirement Planning (MRP)
- Production planning and capacity analysis
- 9-stage job order lifecycle (Draft > Planned > Material Issued > In Progress > QC Pending > QC Passed > Completed)
- Karigar (artisan) management -- task assignment, daily wages, skill tracking
- Karigar metal balance ledger (issued vs. returned vs. wasted)
- WIP monitoring with stage-gate tracking
- Quality control checkpoints with pass/fail/rework
- Tunch (purity) and wastage calculations
- Job costing (materials + labor + overhead)
- Assembly / disassembly support

### Retail & Point of Sale
- Touch-optimized POS interface with barcode scanner and weighing scale integration
- Jewelry-specific pricing: (Metal Rate x Weight) + Making Charges + Wastage + GST
- Live metal rate integration for real-time pricing
- Split payment support (Cash + Card + UPI + Old Gold + Loyalty Points)
- Old gold purchase with purity testing workflow and exchange against new purchases
- Repair order tracking with profitability analysis
- Custom/bespoke order management linked to manufacturing
- Layaway / installment management
- Appraisal management
- Discount engine (percentage, fixed, buy-X-get-Y)
- Gift cards and vouchers
- Invoice generation with item images, HUID details, weight/purity specs

### Financial & Accounting
- Double-entry general ledger with chart of accounts
- Accounts Payable / Accounts Receivable with aging
- Full GST compliance (CGST/SGST auto-split for intra-state, IGST for inter-state)
- 3% jewelry GST (HSN 7113), 5% on making charges
- TDS (Section 194Q) and TCS (Section 206C) with threshold tracking
- E-invoicing and E-Way Bill generation
- GSTR-1 and GSTR-3B worksheet generation
- Bank reconciliation with auto-matching
- Multi-currency support with exchange rate management
- Profit & Loss, Balance Sheet, Trial Balance, Cash Flow statements
- Cost center tracking
- Margin enforcement rules
- Financial year management (India: Apr-Mar, US: Jan-Dec)

### CRM & Customer Management
- Customer 360 view (profile + purchases + loyalty + interactions + feedback)
- Loyalty engine with points, tiers, earning rules, and redemption
- Digital passbook for customers (schemes, loyalty, purchase history)
- Notification engine (WhatsApp, SMS, Email) with templates
- Birthday / anniversary reminders with auto-notifications
- Marketing campaign management with audience segmentation
- Lead management pipeline (New > Contacted > Qualified > Won)
- Customer feedback collection and analysis
- Occasion tracking and personalized marketing

### Wholesale & Distribution
- Purchase order management with approval workflow
- Goods receipt with 3-way matching (PO, receipt, invoice)
- Outgoing consignment / memo tracking (every gram accounted for)
- Incoming consignment management
- Supplier rate contracts
- Agent/broker commission management (percentage, fixed per unit, fixed per weight)
- Credit limit management with automatic enforcement
- Outstanding payment tracking with aging buckets (30/60/90/120+ days)

### E-Commerce & Omnichannel
- Shopify integration (product sync, order import, inventory sync)
- Marketplace adapters (Amazon, Flipkart) -- structured for integration
- Payment gateway integration (Razorpay, Stripe, PayU)
- Shipping integration (Shiprocket, Delhivery) -- structured for integration
- Omnichannel order management (unified orders from all channels)
- Click-and-collect (buy online, pick up in store)
- Product catalog sync with channel-specific pricing
- Webhook handling with HMAC verification
- Product review moderation

### Export & International Trade
- Export invoice generation with LUT (Letter of Undertaking) for zero-rated IGST
- Multi-currency invoicing with exchange rate locking
- HS code reference browser (Chapter 71 for jewelry)
- Customs duty calculator by destination country
- Shipping document generation (packing list, shipping bill, certificate of origin, ARE-1/ARE-3, GR form)
- DGFT license tracking (Advance License, DFIA, EPCG, MEIS, RODTEP) with utilization monitoring
- Country-specific compliance checker
- IE Code and AD Code management

### Compliance & Traceability
- HUID (Hallmark Unique Identification) tracking and enforcement -- mandatory for gold sales in India
- BIS hallmark submission workflow (submit > test > pass/fail > HUID assignment)
- Gemstone certificate management (GIA, IGI, HRD, SGL)
- Full chain-of-custody traceability (source to sale)
- Kimberley Process compliance for diamonds
- Conflict-free sourcing documentation
- Insurance policy tracking with coverage monitoring
- Compliance audit scheduling and findings tracking

### India-Specific Features
- **Girvi (Mortgage Lending)**: Loan creation, collateral tracking, interest accrual (simple/compound), payment allocation, auction workflow for defaults, KYC enforcement
- **Kitty / Chit Schemes**: Scheme creation, member enrollment, installment tracking, maturity handling
- **Gold Savings Schemes**: Monthly deposits with bonus months (pay 11, get 12), maturity calculator
- **MCX/IBJA Live Rates**: Manual entry + API integration structure, in-memory cache
- **UPI Payment Integration**: QR code generation, payment verification
- **Aadhaar eKYC & PAN Verification**: Document validation with format checks
- **Indian Banking**: NEFT/RTGS/IMPS reference templates

### Reporting & Analytics
- Configurable dashboard with drag-and-drop widgets
- Sales reports (daily summary, by product/salesperson/location/category, period comparison)
- Inventory reports (stock summary, low stock, dead stock, fast/slow movers, aging)
- Manufacturing reports (job summary, karigar performance, wastage, cost analysis)
- CRM reports (acquisition, retention, lifetime value, loyalty metrics, lead funnel)
- Demand forecasting (simple moving average + exponential smoothing)
- Statistical reorder point calculation
- Custom report builder (select entity, columns, filters, grouping, aggregations)
- Scheduled report delivery (PDF/Excel/CSV via email)
- Tax reports (GSTR-1, GSTR-3B, TDS/TCS registers)
- Audit trail reports

### Hardware Integration
- **RFID Readers**: Tag scanning, product lookup, RFID-based stock taking, anti-theft
- **Barcode Scanners**: Keyboard wedge mode detection, product lookup, bulk generation
- **Weighing Scales**: Real-time weight capture via WebSocket, tare handling, tolerance validation
- **Label Printers**: Template designer, jewelry-specific labels (SKU, weight, purity, HUID, price, barcode), ZPL output
- **Customer-Facing Displays**: VFD message formatting (product info, running total, amount due)
- **Biometric Attendance**: Check-in/check-out, linked to karigar attendance records

### Mobile Applications (React Native / Expo)
- **Owner App**: KPI dashboard, approval workflows, report summaries, rate entry
- **Sales Staff App**: Quick billing with barcode scan, customer lookup, stock check, today's summary
- **Customer App**: Digital passbook, loyalty points, scheme tracking, product catalog, store locator
- **Agent App**: Collection tracking, visit logging, order booking, commission dashboard

### Platform & Infrastructure
- Multi-tenant architecture (tenant isolation via `tenantId` on every table)
- Role-based access control (RBAC) with granular permissions per module/resource/action
- Multi-branch management with branch-level settings
- Real-time sync via WebSocket
- Data import/export (CSV/Excel) with column mapping wizard
- Comprehensive audit trail (every data change logged with before/after values)
- Multi-language support infrastructure (English, Hindi, Tamil, and more)
- File management (S3-compatible storage for images, documents, certificates)
- Automated backup scheduling
- In-app notifications with real-time push

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Backend** | NestJS 11, TypeScript 5.x (strict mode) |
| **Database** | MySQL 8 with Prisma 6 ORM (split schemas per domain) |
| **API** | tRPC (internal, end-to-end type-safe) + REST/Swagger (external) |
| **Queue** | BullMQ on Redis 7 |
| **Frontend** | Next.js 15 (App Router), React 19 |
| **UI** | shadcn/ui + Tailwind CSS 4 |
| **State** | Zustand (client) + TanStack Query (server) |
| **Tables** | TanStack Table |
| **Charts** | Recharts |
| **Mobile** | React Native + Expo (SDK 52) with NativeWind |
| **Search** | Meilisearch |
| **Auth** | Self-hosted JWT + refresh tokens with RBAC |
| **File Storage** | S3-compatible (MinIO for dev, AWS S3 for production) |
| **Containerization** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions |
| **Testing** | Vitest + Playwright + Supertest |

---

## Architecture

```
CaratFlow/
├── packages/
│   ├── db/              # Prisma ORM -- 13 split schemas, 100+ models, seed data
│   ├── shared-types/    # Zod schemas, TypeScript types, domain events (6,600+ lines)
│   ├── utils/           # Money, weight, purity, tax, date, validator utilities
│   └── ui/              # Shared React component library (shadcn/ui based)
├── apps/
│   ├── api/             # NestJS backend -- 13 domain modules, 124 service files
│   ├── web/             # Next.js frontend -- ~150 pages, ~100 components
│   └── mobile/          # React Native / Expo -- 4 role-based mobile apps
├── tests/               # E2E test suites
├── docs/                # Architecture, API reference, deployment, compliance guides
└── .github/workflows/   # CI pipeline
```

### Key Design Decisions

- **Money as integers**: All monetary values stored in the smallest currency unit (paise for INR, cents for USD). No floating-point rounding errors.
- **Weights as integers**: All weights stored in milligrams. Display conversion to grams, carats, tola, or troy ounce happens in the UI layer.
- **Event-driven modules**: Domain modules communicate via typed async events (BullMQ). Zero cross-module code imports. Each module owns its own schema, types, and API.
- **Split Prisma schemas**: Each domain has its own `.prisma` file (4,888 total lines). Cross-domain references use foreign keys to anchor entities in `core.prisma`.
- **Multi-tenant from day one**: `tenantId` on every table, extracted from JWT, enforced in every query.

---

## Quick Start

### Prerequisites
- Node.js 22 LTS
- pnpm 9+
- Docker & Docker Compose

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Globussoft-Technologies/caratflow.git
cd caratflow

# Start infrastructure services
docker-compose up -d   # MySQL 8, Redis 7, Meilisearch, MinIO

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env   # Edit with your settings

# Setup database
pnpm db:generate       # Generate Prisma client
pnpm db:push           # Push schema to MySQL
pnpm db:seed           # Seed demo data (Sharma Jewellers, Mumbai)

# Start development servers
pnpm dev               # Starts API (port 3001) + Web (port 3000)
```

### Demo Credentials (after seeding)
```
Email: admin@sharmajewellers.com
Password: admin123
Tenant: sharma-jewellers
```

---

## Project Structure by Module

| Module | Schema Lines | Backend Files | Frontend Pages | Components |
|--------|-------------|---------------|---------------|------------|
| **Core/Foundation** | 517 | 18 (auth, RBAC, tRPC, events) | 5 (auth, dashboard shell) | 14 (UI library) |
| **Inventory** | 311 | 6 | 9 | 8 |
| **Financial** | 376 | 8 | 15 | 6 |
| **Manufacturing** | 443 | 8 | 10 | 8 |
| **Retail/POS** | 484 | 13 | 9 | 9 |
| **CRM** | 406 | 9 | 11 | 9 |
| **Platform** | 223 | 13 | 14 | 4 |
| **Wholesale** | 428 | 9 | 10 | 7 |
| **Compliance** | 359 | 10 | 13 | 7 |
| **India-Specific** | 442 | 8 | 10 | 10 |
| **Reporting** | 165 | 11 | 11 | 9 |
| **E-Commerce** | 393 | 10 | 11 | 9 |
| **Export** | 341 | 9 | 14 | 10 |
| **Hardware** | -- | 10 | 4 | 10 |
| **Mobile** | -- | -- | 28 screens | 14 |
| **Testing/Docs** | -- | 10 (test files) | -- | -- |
| **TOTAL** | **4,888** | **~155** | **~150 pages + 28 mobile** | **~120** |

---

## Database Schema Overview

**100+ models across 13 Prisma schema files:**

- **Core**: Tenant, User, Role, Customer, Supplier, Product, Category, Location, Account, Currency, Country, AuditLog
- **Inventory**: StockItem, StockMovement, StockTransfer, StockTake, MetalStock, StoneStock, BatchLot, SerialNumber
- **Manufacturing**: BillOfMaterials, BomItem, JobOrder, JobOrderItem, JobCost, Karigar, KarigarAttendance, KarigarMetalBalance, KarigarTransaction, QualityCheckpoint, ProductionPlan
- **Retail**: Sale, SaleLineItem, SalePayment, SaleReturn, RepairOrder, CustomOrder, Layaway, OldGoldPurchase, Appraisal, Discount, GiftCard
- **Financial**: JournalEntry, JournalEntryLine, Invoice, InvoiceLineItem, Payment, TaxTransaction, BankAccount, BankTransaction, FinancialYear, CostCenter, Budget
- **CRM**: LoyaltyProgram, LoyaltyTransaction, CustomerOccasion, CustomerInteraction, NotificationTemplate, NotificationLog, Campaign, Lead, LeadActivity, Feedback, CustomerSegment, DigitalPassbook
- **Wholesale**: PurchaseOrder, GoodsReceipt, ConsignmentOut/In, AgentBroker, AgentCommission, CreditLimit, OutstandingBalance, RateContract
- **Compliance**: HuidRecord, HallmarkSubmission, HallmarkCenter, GemstoneCertificate, ChainOfCustody, ComplianceDocument, InsurancePolicy, ComplianceAudit
- **India**: GirviLoan, GirviPayment, GirviInterestAccrual, GirviAuction, KittyScheme, KittyMember, GoldSavingsScheme, MetalRateHistory, KycVerification
- **E-Commerce**: SalesChannel, CatalogItem, OnlineOrder, Shipment, PaymentGateway, OnlinePayment, WebhookLog, ProductReview, ClickAndCollect
- **Export**: ExportOrder, ExportInvoice, ShippingDocument, CustomsDuty, HsCode, ExchangeRateHistory, ExportCompliance, DgftLicense
- **Reporting**: SavedReport, ScheduledReport, ReportExecution, DashboardLayout, DashboardWidget
- **Platform**: Permission, Setting, ImportJob, ExportJob, Notification, ActivityLog, BackupSchedule, TranslationKey, FileUpload

---

## API Structure

All internal API calls use **tRPC** for end-to-end type safety. External integrations use **REST with Swagger/OpenAPI**.

```
tRPC Routers:
├── inventory    (stockItems, movements, transfers, stockTakes, metalStock, stoneStock, valuation)
├── financial    (journal, invoices, payments, tax, bank, reports)
├── manufacturing (bom, jobs, karigars, qc, planning)
├── retail       (sales, returns, repairs, customOrders, layaway, oldGold, appraisals, discounts)
├── crm          (customers, loyalty, notifications, campaigns, leads, feedback)
├── wholesale    (purchaseOrders, consignments, agents, credit, rateContracts)
├── ecommerce    (channels, catalog, orders, shipments, payments, webhooks, clickCollect)
├── export       (orders, invoices, documents, duty, exchangeRates, licenses, compliance)
├── compliance   (huid, hallmark, certificates, traceability, documents, insurance, audits)
├── india        (girvi, schemes.kitty, schemes.goldSavings, rates, kyc, payments)
├── reporting    (sales, inventory, manufacturing, crm, custom, forecast, dashboard, scheduled)
├── platform     (users, roles, branches, settings, import, export, audit, notifications, i18n, files)
└── hardware     (devices, rfid, barcode, scale, printer, display, biometric)
```

---

## Domain Events

CaratFlow uses an event-driven architecture for cross-module communication. 30+ typed domain events flow through BullMQ:

```
inventory.stock.adjusted     -> Financial (asset valuation), Ecommerce (sync stock)
retail.sale.completed        -> Inventory (decrement), Financial (journal entry), CRM (loyalty points)
manufacturing.job.completed  -> Inventory (add finished goods), Financial (WIP accounting)
retail.custom_order.created  -> Manufacturing (create job order)
financial.payment.received   -> Wholesale (update outstanding), India (scheme installments)
compliance.hallmark.verified -> Export (update readiness)
...and 24 more
```

---

## Testing

```bash
# Run utility unit tests
pnpm test:utils

# Run API integration tests
pnpm test:api

# Run E2E tests (requires running services)
RUN_E2E=true pnpm test:e2e
```

**170+ test cases** covering:
- Money arithmetic (INR/USD/AED formatting, currency conversion, precision)
- Weight conversions (mg/g/carat/tola/troy oz, round-trip accuracy)
- Indian tax calculations (GST CGST/SGST/IGST split, TDS/TCS thresholds)
- Validators (GSTIN, PAN, Aadhaar Verhoeff checksum, HUID)
- Auth flows (register, login, refresh tokens, RBAC)
- Inventory operations (stock movements, transfers, stock takes)
- Retail pricing (metal rate x weight + making + GST)
- Financial accounting (balanced journal entries, GST computation, trial balance)
- Manufacturing (BOM explosion, job order state machine)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design, module map, data flow, event architecture |
| [API Reference](docs/api-reference.md) | tRPC routers, REST endpoints, error codes, pagination |
| [Database Schema](docs/database-schema.md) | Entity relationships, conventions, indexing strategy |
| [Deployment Guide](docs/deployment.md) | Dev setup, production Docker, environment variables, scaling |
| [Module Guide](docs/module-guide.md) | How to add new modules, conventions, patterns |
| [India Compliance](docs/india-compliance.md) | GST, HUID, hallmarking, TDS/TCS, girvi regulations, KYC |

---

## Key Constants

| Constant | Value |
|----------|-------|
| Gold GST Rate | 3% (HSN 7113) |
| Making Charges GST | 5% |
| 24K Gold Fineness | 999 |
| 22K Gold Fineness | 916 |
| 18K Gold Fineness | 750 |
| 14K Gold Fineness | 585 |
| 1 Tola | 11.664 grams |
| 1 Troy Ounce | 31.1035 grams |
| 1 Carat | 200 milligrams |
| Indian Financial Year | April 1 -- March 31 |
| TDS 194Q Threshold | Rs. 50,00,000 |
| TCS 206C Threshold | Rs. 50,00,000 |

---

## Roadmap

### Phase 2: B2C E-Commerce Storefront (In Progress)
- [ ] B2C customer-facing storefront (browse, search, filter, product pages, cart, checkout)
- [ ] Customer self-service portal (my orders, returns, address book, KYC, scheme dashboard)
- [ ] Social login (Google, Facebook, Apple ID) + OTP-based mobile auth
- [ ] Two-factor authentication (2FA) for high-value transactions
- [ ] Digital Gold module (buy/sell/accumulate fractional gold, SIP auto-debit, redemption)
- [ ] Wishlist & favorites with price drop alerts
- [ ] Abandoned cart tracking & recovery (WhatsApp, email, push)
- [ ] Coupon code system (separate from discount rules)
- [ ] Product comparison
- [ ] Pre-order / backorder management + back-in-stock notifications
- [ ] CMS for admin (banners, homepage content, blog management)
- [ ] Referral rewards program
- [ ] AML compliance monitoring (suspicious transaction flagging)
- [ ] AR Virtual Try-On (rings, necklaces, earrings)
- [ ] 360-degree product view
- [ ] Order modification before processing
- [ ] BNPL / EMI payment options
- [ ] Biometric payment security (Face ID / fingerprint) in mobile
- [ ] AI-powered product recommendations
- [ ] AI chatbot for personalized shopping assistance
- [ ] Voice search integration
- [ ] Live shopping & video consultation

### Phase 3: Production & Integrations
- [ ] Complete Shopify webhook handlers and inventory sync
- [ ] Razorpay and Stripe payment gateway full integration
- [ ] Shiprocket and Delhivery shipping API integration
- [ ] MCX/IBJA live rate API polling
- [ ] Aadhaar eKYC and PAN verification API integration
- [ ] NIC E-Invoice API integration
- [ ] WhatsApp Business API integration
- [ ] Tally accounting software sync
- [ ] Production hardening and performance optimization
- [ ] Advanced AI analytics and demand forecasting
- [ ] Multi-language UI translations
- [ ] Mobile app beta release (iOS + Android)
- [ ] Kubernetes deployment manifests
- [ ] Performance benchmarks and load testing

---

## License

Proprietary. All rights reserved.

Copyright 2026 [Globussoft Technologies](https://github.com/Globussoft-Technologies).

---

## Built With

CaratFlow was designed and built using a parallel agent architecture -- 16 specialized AI agents working across 5 waves to build every module simultaneously, from database schemas to production UI.

Built by [Globussoft Technologies](https://github.com/Globussoft-Technologies).
