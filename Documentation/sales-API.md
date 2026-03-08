# Sales API Documentation

## Overview
The Sales API manages sales transactions in the Dr. Mobile POS system. This API handles creating sales orders, tracking items sold, managing inventory updates, and generating sales reports with integrated transaction support.

## Base URL
```
http://localhost:3000/api/sales
```

---

## Table of Contents
- [Models](#models)
  - [Sales Model](#sales-model)
  - [Item Sales Model](#item-sales-model)
- [Endpoints](#endpoints)
  - [Create Sale](#create-sale)
  - [Get All Sales](#get-all-sales)
  - [Get Sale by ID](#get-sale-by-id)
  - [Get Sales by Customer](#get-sales-by-customer)
  - [Get Sales Summary](#get-sales-summary)
  - [Update Sale Status](#update-sale-status)
  - [Delete Sale](#delete-sale)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Models

### Sales Model
The main sales transaction entity containing order details and payment information.

**Table Name:** `sales`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sales_id` | STRING | Yes (PK) | Auto-generated sale ID (format: SALE-XXXXXX) |
| `customer_id` | STRING | No | Reference to customer (null for walk-in customers) |
| `total_discount` | FLOAT | No | Total discount applied to the sale |
| `total_amount` | FLOAT | Yes | Final total amount of the sale |
| `sales_date` | DATE | Yes | Date and time of the sale |
| `payment_method` | STRING | Yes | Payment method (e.g., "cash", "card", "mobile") |
| `status` | STRING | Yes | Sale status (e.g., "completed", "pending", "cancelled") |
| `createdAt` | DATE | Auto | Record creation timestamp |
| `updatedAt` | DATE | Auto | Record update timestamp |

### Item Sales Model
Individual items sold in each transaction.

**Table Name:** `item_sales`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | STRING | Yes (PK) | Auto-generated item sale ID (format: ITEM-XXXXXX) |
| `sales_id` | STRING | Yes | Reference to the parent sale |
| `product_id` | STRING | Yes | Reference to the product sold |
| `unit_price` | FLOAT | Yes | Price per unit at time of sale |
| `quantity` | INTEGER | Yes | Quantity of items sold |
| `discount` | FLOAT | Yes | Discount applied to this item |
| `total_price` | FLOAT | Yes | Total price for this item (unit_price × quantity - discount) |
| `sale_date` | DATE | Yes | Date of the sale |
| `createdAt` | DATE | Auto | Record creation timestamp |
| `updatedAt` | DATE | Auto | Record update timestamp |

---

## Endpoints

### Create Sale

Creates a new sale transaction with multiple items and automatically updates product stock levels.

**Endpoint:** `POST /api/sales`

**Request Body:**
```json
{
  "customer_id": "CUST-000001",  // Optional - omit for walk-in sales
  "items": [
    {
      "product_id": "PROD-000001",
      "quantity": 2,
      "unit_price": 999.99,
      "discount": 50.00  // Optional per-item discount
    },
    {
      "product_id": "PROD-000002",
      "quantity": 1,
      "unit_price": 599.99,
      "discount": 0
    }
  ],
  "total_discount": 100.00,  // Optional - additional overall discount
  "payment_method": "card",
  "status": "completed"  // Optional - defaults to "completed"
}
```

**Validation Rules:**
- At least one item is required
- Payment method is required
- Each item must have product_id, quantity, and unit_price
- Product stock must be sufficient for the requested quantity
- All referenced products must exist

**Success Response:** `201 Created`
```json
{
  "message": "Sale created successfully",
  "sale": {
    "sales_id": "SALE-000001",
    "customer_id": "CUST-000001",
    "total_discount": 100.00,
    "total_amount": 2449.98,
    "sales_date": "2026-03-08T10:30:00.000Z",
    "payment_method": "card",
    "status": "completed",
    "items": [
      {
        "id": "ITEM-000001",
        "sales_id": "SALE-000001",
        "product_id": "PROD-000001",
        "unit_price": 999.99,
        "quantity": 2,
        "discount": 50.00,
        "total_price": 1949.98,
        "product": {
          "id": "PROD-000001",
          "productName": "iPhone 14 Pro",
          "brand": "Apple",
          "model": "A2890"
        }
      }
    ],
    "customer": {
      "customer_id": "CUST-000001",
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or validation errors
- `404 Not Found` - Product or customer not found
- `500 Internal Server Error` - Server error

---

### Get All Sales

Retrieves all sales with pagination and optional filters.

**Endpoint:** `GET /api/sales`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Items per page (default: 10) |
| `status` | String | No | Filter by status |
| `payment_method` | String | No | Filter by payment method |
| `start_date` | Date | No | Filter sales from this date (YYYY-MM-DD) |
| `end_date` | Date | No | Filter sales until this date (YYYY-MM-DD) |

**Example Request:**
```
GET /api/sales?page=1&limit=10&status=completed&start_date=2026-03-01
```

**Success Response:** `200 OK`
```json
{
  "message": "Sales retrieved successfully",
  "totalSales": 45,
  "currentPage": 1,
  "totalPages": 5,
  "sales": [
    {
      "sales_id": "SALE-000001",
      "customer_id": "CUST-000001",
      "total_discount": 100.00,
      "total_amount": 2449.98,
      "sales_date": "2026-03-08T10:30:00.000Z",
      "payment_method": "card",
      "status": "completed",
      "items": [...],
      "customer": {...}
    }
  ]
}
```

---

### Get Sale by ID

Retrieves detailed information about a specific sale including all items and customer details.

**Endpoint:** `GET /api/sales/:id`

**Parameters:**
- `id` (required) - The sale ID

**Example Request:**
```
GET /api/sales/SALE-000001
```

**Success Response:** `200 OK`
```json
{
  "message": "Sale retrieved successfully",
  "sale": {
    "sales_id": "SALE-000001",
    "customer_id": "CUST-000001",
    "total_discount": 100.00,
    "total_amount": 2449.98,
    "sales_date": "2026-03-08T10:30:00.000Z",
    "payment_method": "card",
    "status": "completed",
    "items": [
      {
        "id": "ITEM-000001",
        "sales_id": "SALE-000001",
        "product_id": "PROD-000001",
        "unit_price": 999.99,
        "quantity": 2,
        "discount": 50.00,
        "total_price": 1949.98,
        "product": {
          "id": "PROD-000001",
          "productName": "iPhone 14 Pro",
          "brand": "Apple",
          "model": "A2890",
          "price": 999.99,
          "description": "Latest iPhone model"
        }
      }
    ],
    "customer": {
      "customer_id": "CUST-000001",
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St"
    }
  }
}
```

**Error Responses:**
- `404 Not Found` - Sale not found

---

### Get Sales by Customer

Retrieves all sales for a specific customer with pagination.

**Endpoint:** `GET /api/sales/customer/:customer_id`

**Parameters:**
- `customer_id` (required) - The customer ID

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Items per page (default: 10) |

**Example Request:**
```
GET /api/sales/customer/CUST-000001?page=1&limit=10
```

**Success Response:** `200 OK`
```json
{
  "message": "Customer sales retrieved successfully",
  "totalSales": 12,
  "currentPage": 1,
  "totalPages": 2,
  "sales": [
    {
      "sales_id": "SALE-000001",
      "customer_id": "CUST-000001",
      "total_discount": 100.00,
      "total_amount": 2449.98,
      "sales_date": "2026-03-08T10:30:00.000Z",
      "payment_method": "card",
      "status": "completed",
      "items": [...]
    }
  ]
}
```

**Error Responses:**
- `404 Not Found` - No sales found for this customer

---

### Get Sales Summary

Retrieves sales statistics and summary information for a specified date range.

**Endpoint:** `GET /api/sales/summary`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | Date | No | Summary from this date (YYYY-MM-DD) |
| `end_date` | Date | No | Summary until this date (YYYY-MM-DD) |

**Example Request:**
```
GET /api/sales/summary?start_date=2026-03-01&end_date=2026-03-08
```

**Success Response:** `200 OK`
```json
{
  "message": "Sales summary retrieved successfully",
  "summary": {
    "totalSales": 45,
    "totalRevenue": 125450.50,
    "averageSaleAmount": 2787.79,
    "totalDiscounts": 5250.00,
    "statusBreakdown": [
      {
        "status": "completed",
        "count": "40"
      },
      {
        "status": "pending",
        "count": "3"
      },
      {
        "status": "cancelled",
        "count": "2"
      }
    ],
    "paymentMethodBreakdown": [
      {
        "payment_method": "card",
        "count": "25"
      },
      {
        "payment_method": "cash",
        "count": "15"
      },
      {
        "payment_method": "mobile",
        "count": "5"
      }
    ]
  }
}
```

---

### Update Sale Status

Updates the status of an existing sale.

**Endpoint:** `PATCH /api/sales/:id/status`

**Parameters:**
- `id` (required) - The sale ID

**Request Body:**
```json
{
  "status": "cancelled"
}
```

**Success Response:** `200 OK`
```json
{
  "message": "Sale status updated successfully",
  "sale": {
    "sales_id": "SALE-000001",
    "customer_id": "CUST-000001",
    "total_discount": 100.00,
    "total_amount": 2449.98,
    "sales_date": "2026-03-08T10:30:00.000Z",
    "payment_method": "card",
    "status": "cancelled",
    "createdAt": "2026-03-08T10:30:00.000Z",
    "updatedAt": "2026-03-08T14:20:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Status not provided
- `404 Not Found` - Sale not found

---

### Delete Sale

Deletes a sale and restores the stock for all items in the sale.

**Endpoint:** `DELETE /api/sales/:id`

**Parameters:**
- `id` (required) - The sale ID

**Example Request:**
```
DELETE /api/sales/SALE-000001
```

**Success Response:** `200 OK`
```json
{
  "message": "Sale deleted successfully and stock restored"
}
```

**Error Responses:**
- `404 Not Found` - Sale not found
- `500 Internal Server Error` - Failed to delete sale

**Important Notes:**
- Deleting a sale will automatically restore the inventory for all products in that sale
- This operation uses database transactions to ensure data consistency
- Item sales records are cascade deleted with the parent sale

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data or validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Examples

### Example 1: Create a Walk-in Sale (No Customer)

**Request:**
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": "PROD-000001",
        "quantity": 1,
        "unit_price": 799.99,
        "discount": 0
      }
    ],
    "payment_method": "cash",
    "status": "completed"
  }'
```

### Example 2: Create a Customer Sale with Multiple Items

**Request:**
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST-000001",
    "items": [
      {
        "product_id": "PROD-000001",
        "quantity": 2,
        "unit_price": 999.99,
        "discount": 50.00
      },
      {
        "product_id": "PROD-000005",
        "quantity": 1,
        "unit_price": 49.99,
        "discount": 0
      }
    ],
    "total_discount": 100.00,
    "payment_method": "card",
    "status": "completed"
  }'
```

### Example 3: Get Sales Report for Last 30 Days

**Request:**
```bash
curl -X GET "http://localhost:3000/api/sales?start_date=2026-02-06&end_date=2026-03-08&page=1&limit=20"
```

### Example 4: Get Sales Summary

**Request:**
```bash
curl -X GET "http://localhost:3000/api/sales/summary?start_date=2026-03-01&end_date=2026-03-08"
```

### Example 5: Update Sale Status to Cancelled

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/sales/SALE-000001/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled"
  }'
```

---

## Business Logic Notes

1. **Stock Management:**
   - When a sale is created, product stock is automatically decremented
   - When a sale is deleted, product stock is automatically restored
   - Stock validation occurs before sale creation to prevent overselling

2. **Customer Association:**
   - Sales can be associated with a customer or created as walk-in sales (no customer_id)
   - Customer sales history is tracked for reporting purposes

3. **Pricing and Discounts:**
   - Unit prices are captured at the time of sale
   - Discounts can be applied per-item and/or to the total sale
   - Total amount is calculated as: (sum of all item totals) - total_discount

4. **Transaction Safety:**
   - All create and delete operations use database transactions
   - If any part of the sale creation fails, all changes are rolled back
   - Stock updates are atomic and consistent

---

## Integration with Other APIs

The Sales API integrates with:
- **Product API:** Validates product existence and manages stock levels
- **Customer API:** Links sales to customer records for history tracking

Related APIs:
- [Product API Documentation](./Product-API.md)
- [Customer API Documentation](./customer-API.md)
