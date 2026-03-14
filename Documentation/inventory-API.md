# Inventory API Documentation

## Overview
The Inventory API handles stock issuance from inventory to shops and provides stock issue history in Dr. Mobile POS.

## Base URL
```
http://localhost:3000/api/inventory
```

---

## Table of Contents
- [Models](#models)
	- [Stock Issues Model](#stock-issues-model)
- [Endpoints](#endpoints)
	- [Issue Stock](#issue-stock)
	- [Get All Stock Issues](#get-all-stock-issues)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Models

### Stock Issues Model

Tracks each stock issue event from product inventory to a shop.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | INTEGER | Auto (PK) | Auto-increment issue ID |
| `product_id` | STRING | Yes | Product ID being issued |
| `issued_to` | STRING | Yes | Shop name destination |
| `issued_shop_id` | STRING | Yes | Shop ID destination |
| `issued_stock` | INTEGER | Yes | Quantity issued |
| `selling_price` | DECIMAL(10,2) | Yes | Selling price per unit at issue time |
| `issued_date` | DATE | Auto | Issue date/time |
| `status` | ENUM | Yes | `pending_payment` or `sold` |
| `createdAt` | DATE | Auto | Record creation timestamp |
| `updatedAt` | DATE | Auto | Record update timestamp |

---

## Endpoints

### Issue Stock

Issues product stock to a specific shop and updates both inventory quantity and shop sales aggregates.

**Endpoint:** `POST /api/inventory/issue`

**Request Body:**
```json
{
	"product_id": "PROD-00001",
	"issued_shop_id": "SHOP-00010",
	"issued_stock": 2,
	"selling_price": 150000,
	"payment_status": "pending_payment"
}
```

**Required Fields:**
- `product_id`
- `issued_shop_id`
- `issued_stock`
- `selling_price`

**Optional Field:**
- `payment_status` (defaults to `pending_payment`)

**Important behavior:**
- Validates product exists.
- Validates shop exists.
- Validates available quantity in stock.
- Creates a `Stock_Issues` record.
- Decreases `Product_Stock.quantity_in_stock`.
- Updates `shopSales` aggregate totals for the target shop.

**Success Response:** `200 OK`
```json
{
	"success": true,
	"message": "Stock issued successfully",
	"data": {
		"id": 12,
		"product_id": "PROD-00001",
		"issued_to": "Downtown Branch",
		"issued_shop_id": "SHOP-00010",
		"issued_stock": 2,
		"selling_price": "150000.00",
		"status": "pending_payment",
		"createdAt": "2026-03-14T08:00:00.000Z",
		"updatedAt": "2026-03-14T08:00:00.000Z"
	}
}
```

---

### Get All Stock Issues

Returns paginated stock issue history with product and destination shop information.

**Endpoint:** `GET /api/inventory/issues`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number |

**Pagination behavior:**
- `per_page` is fixed to `100` records.

**Success Response:** `200 OK`
```json
{
	"success": true,
	"message": "Stock issues retrieved successfully",
	"pagination": {
		"total_records": 1,
		"total_pages": 1,
		"current_page": 1,
		"per_page": 100
	},
	"data": [
		{
			"id": 12,
			"product_name": "iPhone 14 Pro",
			"price": "150000.00",
			"wholesale_price": "145000.00",
			"capacity": "256GB",
			"color": "Black",
			"IMEI": "359876543210987",
			"stock_status": "issued",
			"issue_status": "pending_payment",
			"storage_location": "Downtown Branch",
			"issued_to": "Downtown Branch",
			"issued_date": "2026-03-14T08:00:00.000Z"
		}
	]
}
```

---

## Error Handling

### Product Not Found
**Status:** `404 Not Found`
```json
{
	"message": "Product not found"
}
```

### Shop Not Found
**Status:** `404 Not Found`
```json
{
	"message": "Shop not found"
}
```

### Insufficient Stock
**Status:** `400 Bad Request`
```json
{
	"message": "Insufficient stock"
}
```

### Server Error
**Status:** `500 Internal Server Error`
```json
{
	"success": false,
	"message": "Error issuing stock",
	"error": "Detailed error"
}
```

---

## Examples

### cURL: Issue Stock
```bash
curl -X POST http://localhost:3000/api/inventory/issue \
	-H "Content-Type: application/json" \
	-d '{
		"product_id": "PROD-00001",
		"issued_shop_id": "SHOP-00010",
		"issued_stock": 2,
		"selling_price": 150000,
		"payment_status": "pending_payment"
	}'
```

### cURL: Get All Stock Issues
```bash
curl "http://localhost:3000/api/inventory/issues?page=1"
```
