# Shops API Documentation

## Overview
The Shops API manages shop profiles and shop-level sales aggregate records in the Dr. Mobile POS system. It supports creating and maintaining shops, searching and filtering shops, and retrieving stored shop sales summaries.

## Base URL
```
http://localhost:3000/api/shops
```

---

## Table of Contents
- [Models](#models)
	- [Shop Model](#shop-model)
	- [Shop Sales Model](#shop-sales-model)
- [Endpoints](#endpoints)
	- [Create Shop](#create-shop)
	- [Get All Shops](#get-all-shops)
	- [Search Shops](#search-shops)
	- [Get Shop by ID](#get-shop-by-id)
	- [Update Shop](#update-shop)
	- [Delete Shop](#delete-shop)
	- [Get Shop Sales Summary](#get-shop-sales-summary)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Models

### Shop Model
Represents a retail shop profile and ownership details.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shop_id` | STRING | Yes (PK) | Shop unique ID (auto-generated as `SHOP-XXXXX` if not provided) |
| `name` | STRING | Yes | Shop name |
| `location` | STRING | Yes | Physical location/address |
| `contact_number` | STRING | Yes | Shop contact number |
| `owner_name` | STRING | Yes | Owner full name |
| `owner_customer_id` | STRING | Yes (FK) | Reference to `customer.customer_id` |
| `createdAt` | DATE | Auto | Record creation timestamp |
| `updatedAt` | DATE | Auto | Record update timestamp |

### Shop Sales Model
Stores aggregate sales counters for each shop.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shop_id` | STRING | Yes (PK/FK) | Reference to `shop.shop_id` |
| `total_sales` | INTEGER | Yes | Total number of sales entries |
| `total_paid` | DECIMAL/FLOAT | Yes | Total paid amount |
| `total_outstanding` | DECIMAL/FLOAT | Yes | Total outstanding amount |
| `total_devices` | INTEGER | Yes | Total devices count |
| `active_devices` | INTEGER | Yes | Active/pending devices count |
| `sold_devices` | INTEGER | Yes | Sold devices count |
| `createdAt` | DATE | Auto | Record creation timestamp |
| `updatedAt` | DATE | Auto | Record update timestamp |

---

## Endpoints

### Create Shop

Creates a new shop and initializes an empty sales aggregate row.

**Endpoint:** `POST /api/shops`

**Request Body:**
```json
{
	"name": "Downtown Branch",
	"location": "Colombo 03",
	"contact_number": "0771234567",
	"owner_name": "Kasun Perera",
	"owner_customer_id": "CUST-00001",
	"shop_id": "SHOP-00010"
}
```

**Required Fields:**
- `name`
- `location`
- `contact_number`
- `owner_name`
- `owner_customer_id`

**Notes:**
- `shop_id` is optional. If omitted, the system auto-generates one.
- `owner_customer_id` must exist in the customer table.

**Success Response:** `201 Created`
```json
{
	"success": true,
	"message": "Shop created successfully",
	"data": {
		"shop_id": "SHOP-00010",
		"name": "Downtown Branch",
		"location": "Colombo 03",
		"contact_number": "0771234567",
		"owner_name": "Kasun Perera",
		"owner_customer_id": "CUST-00001",
		"sales": {
			"shop_id": "SHOP-00010",
			"total_sales": 0,
			"total_paid": 0,
			"total_outstanding": 0,
			"total_devices": 0,
			"active_devices": 0,
			"sold_devices": 0
		}
	}
}
```

---

### Get All Shops

Retrieves all shops with attached sales rows and aggregate statistics.

**Endpoint:** `GET /api/shops`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | Integer | No | 100 | Maximum number of records to return |
| `owner_customer_id` | String | No | - | Filter by owner customer ID |
| `location` | String | No | - | Partial match on location |

**Example Requests:**
```
GET /api/shops
GET /api/shops?limit=20
GET /api/shops?owner_customer_id=CUST-00001
GET /api/shops?location=Colombo
```

**Success Response:** `200 OK`
```json
{
	"success": true,
	"data": [
		{
			"shop_id": "SHOP-00010",
			"name": "Downtown Branch",
			"location": "Colombo 03",
			"contact_number": "0771234567",
			"owner_name": "Kasun Perera",
			"owner_customer_id": "CUST-00001",
			"sales": {
				"shop_id": "SHOP-00010",
				"total_sales": 12,
				"total_paid": "250000.00",
				"total_outstanding": "15000.00",
				"total_devices": 20,
				"active_devices": 3,
				"sold_devices": 17
			}
		}
	],
	"stats": {
		"total_shops": 1,
		"total_sales": 12,
		"total_devices": 20,
		"total_paid": 250000,
		"total_outstanding": 15000
	},
	"isAll": true
}
```

---

### Search Shops

Searches shops by text across key fields.

**Endpoint:** `GET /api/shops/search`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | String | Yes | Search text applied to shop ID, name, location, contact number, owner name, and owner customer ID |

**Example Request:**
```
GET /api/shops/search?query=Colombo
```

**Success Response:** `200 OK`
```json
{
	"success": true,
	"data": [
		{
			"shop_id": "SHOP-00010",
			"name": "Downtown Branch",
			"location": "Colombo 03",
			"contact_number": "0771234567",
			"owner_name": "Kasun Perera",
			"owner_customer_id": "CUST-00001",
			"sales": {
				"shop_id": "SHOP-00010",
				"total_sales": 12,
				"total_paid": "250000.00",
				"total_outstanding": "15000.00",
				"total_devices": 20,
				"active_devices": 3,
				"sold_devices": 17
			}
		}
	],
	"count": 1
}
```

---

### Get Shop by ID

Returns one shop by ID with related sales data.

**Endpoint:** `GET /api/shops/:id`

**Path Parameter:**
- `id` - Shop ID (example: `SHOP-00010`)

**Success Response:** `200 OK`
```json
{
	"success": true,
	"data": {
		"shop_id": "SHOP-00010",
		"name": "Downtown Branch",
		"location": "Colombo 03",
		"contact_number": "0771234567",
		"owner_name": "Kasun Perera",
		"owner_customer_id": "CUST-00001",
		"sales": {
			"shop_id": "SHOP-00010",
			"total_sales": 12,
			"total_paid": "250000.00",
			"total_outstanding": "15000.00",
			"total_devices": 20,
			"active_devices": 3,
			"sold_devices": 17
		}
	}
}
```

---

### Update Shop

Updates shop profile fields by shop ID.

**Endpoint:** `PUT /api/shops/:id`

**Path Parameter:**
- `id` - Shop ID

**Request Body (all fields optional):**
```json
{
	"name": "Downtown Branch - Updated",
	"location": "Colombo 05",
	"contact_number": "0719999999",
	"owner_name": "Kasun P.",
	"owner_customer_id": "CUST-00002"
}
```

**Notes:**
- `shop_id` in request body is ignored by controller.
- If `owner_customer_id` is provided, it must reference an existing customer.

**Success Response:** `200 OK`
```json
{
	"success": true,
	"message": "Shop updated successfully",
	"data": {
		"shop_id": "SHOP-00010",
		"name": "Downtown Branch - Updated",
		"location": "Colombo 05"
	}
}
```

---

### Delete Shop

Deletes a shop by ID.

**Endpoint:** `DELETE /api/shops/:id`

**Path Parameter:**
- `id` - Shop ID

**Success Response:** `200 OK`
```json
{
	"success": true,
	"message": "Shop deleted successfully"
}
```

---

### Get Shop Sales Summary

Returns the stored sales summary row for a shop. If no summary row exists yet, a zero-initialized row is created and returned.

**Endpoint:** `GET /api/shops/:id/sales-summary`

**Path Parameter:**
- `id` - Shop ID

**Success Response:** `200 OK`
```json
{
	"success": true,
	"data": {
		"shop": {
			"shop_id": "SHOP-00010",
			"name": "Downtown Branch",
			"location": "Colombo 03"
		},
		"summary": {
			"recorded_sales_row": {
				"shop_id": "SHOP-00010",
				"total_sales": 12,
				"total_paid": "250000.00",
				"total_outstanding": "15000.00",
				"total_devices": 20,
				"active_devices": 3,
				"sold_devices": 17
			}
		}
	}
}
```

---

## Error Handling

Common error responses:

### Validation Error
**Status:** `400 Bad Request`
```json
{
	"success": false,
	"message": "Validation error message"
}
```

### Not Found
**Status:** `404 Not Found`
```json
{
	"success": false,
	"message": "Shop not found"
}
```

### Server Error
**Status:** `500 Internal Server Error`
```json
{
	"success": false,
	"message": "Error message",
	"error": "Detailed error"
}
```

---

## Examples

### cURL: Create Shop
```bash
curl -X POST http://localhost:3000/api/shops \
	-H "Content-Type: application/json" \
	-d '{
		"name": "Downtown Branch",
		"location": "Colombo 03",
		"contact_number": "0771234567",
		"owner_name": "Kasun Perera",
		"owner_customer_id": "CUST-00001"
	}'
```

### cURL: Search Shops
```bash
curl "http://localhost:3000/api/shops/search?query=Downtown"
```

### cURL: Get Sales Summary
```bash
curl "http://localhost:3000/api/shops/SHOP-00010/sales-summary"
```
