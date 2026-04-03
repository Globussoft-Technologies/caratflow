# CaratFlow API Reference

## Base URL

- Development: `http://localhost:4000`
- Production: configured via `API_URL` environment variable

## Authentication

All API endpoints (except auth) require a Bearer token in the `Authorization` header.

### REST Auth Endpoints

| Method | Path                         | Description                  |
|--------|------------------------------|------------------------------|
| POST   | `/api/v1/auth/register`      | Register a new user          |
| POST   | `/api/v1/auth/login`         | Login, returns JWT + refresh |
| POST   | `/api/v1/auth/refresh`       | Refresh access token         |
| POST   | `/api/v1/auth/logout`        | Revoke refresh token         |
| POST   | `/api/v1/auth/forgot-password` | Request password reset     |
| POST   | `/api/v1/auth/reset-password`  | Reset password with token  |

**Login request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword",
  "tenantSlug": "my-jewelry-store"
}
```

**Login response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "uuid-v4-token",
    "expiresIn": 900
  }
}
```

**JWT payload:**

```json
{
  "sub": "user-id",
  "tenantId": "tenant-id",
  "email": "user@example.com",
  "role": "admin",
  "permissions": ["inventory.read", "inventory.write", "retail.*"]
}
```

## tRPC Router Structure

The tRPC API is available at `/trpc/{router}.{procedure}`. All procedures require authentication via the tRPC context.

### Module Routers

| Router          | Procedures                                                    |
|-----------------|---------------------------------------------------------------|
| `inventory`     | listStockItems, getStockItem, createStockItem, recordMovement, createTransfer, approveTransfer, receiveTransfer, createStockTake, completeStockTake, getMetalStock, adjustMetalStock |
| `retail`        | createSale, getSale, listSales, voidSale, getPosSession, getDashboard, createReturn, createRepairOrder, updateRepairStatus, createCustomOrder |
| `financial`     | createJournalEntry, postJournalEntry, createInvoice, recordPayment, getTrialBalance, getLedger, getAccountBalance, computeGst |
| `manufacturing` | createBom, updateBom, activateBom, explodeBom, createJobOrder, updateJobStatus, assignKarigar, getDashboard |
| `crm`           | createCustomer, getCustomer, listCustomers, updateCustomer, getLoyaltyPoints, addCommunication |
| `wholesale`     | createOrder, getOrder, listOrders, updateOrderStatus |
| `compliance`    | getGstSummary, getHuidRecords, getTdsTcsReport |
| `reporting`     | getSalesReport, getInventoryReport, getFinancialReport |
| `platform`      | getTenantSettings, updateSettings, getAuditLog |

## Common Request/Response Patterns

### Response Format

All responses follow the `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-04-04T10:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Total debits must equal total credits",
    "details": [
      { "field": "lines", "message": "Unbalanced entry" }
    ]
  }
}
```

### Pagination

**Request parameters:**

| Parameter  | Type   | Default | Description            |
|-----------|--------|---------|------------------------|
| page      | number | 1       | Page number (1-based)  |
| limit     | number | 20      | Items per page (max 100) |
| sortBy    | string | varies  | Field to sort by       |
| sortOrder | string | "desc"  | "asc" or "desc"        |

**Paginated response:**

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Error Codes

| Code                  | HTTP Status | Description                         |
|-----------------------|-------------|--------------------------------------|
| VALIDATION_ERROR      | 400         | Request validation failed            |
| UNAUTHORIZED          | 401         | Missing or invalid authentication    |
| FORBIDDEN             | 403         | Insufficient permissions             |
| NOT_FOUND             | 404         | Resource not found                   |
| CONFLICT              | 409         | Resource already exists              |
| UNPROCESSABLE_ENTITY  | 422         | Business rule violation              |
| INTERNAL_SERVER_ERROR | 500         | Unexpected server error              |
| INSUFFICIENT_STOCK    | 400         | Not enough stock for operation       |
| CURRENCY_MISMATCH     | 400         | Operations on different currencies   |
| INVALID_TRANSITION    | 400         | Invalid status transition            |
| TENANT_NOT_FOUND      | 401         | Tenant does not exist or is inactive |

## Rate Limiting

Rate limiting is planned for production deployment:

- Authenticated requests: 1000 requests/minute per user
- Authentication endpoints: 10 requests/minute per IP
- File uploads: 50 requests/minute per user

Rate limit headers will be included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1712217600
```
