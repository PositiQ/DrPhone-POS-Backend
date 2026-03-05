# Customer API Documentation

Complete API documentation for Customer and Customer Sales Management in Dr. Mobile POS.

## 📋 Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Data Models](#data-models)
  - [Customer Model](#customer-model)
  - [Customer Sales Model](#customer-sales-model)
- [API Endpoints](#api-endpoints)
  - [Customer Management](#customer-management)
  - [Customer Sales Management](#customer-sales-management)
- [Examples](#examples)
- [Error Handling](#error-handling)

---

## Overview

The Customer API provides comprehensive customer relationship management (CRM) functionality including:
- Customer profile management (create, read, update, delete)
- Customer type differentiation (regular/wholesale)
- Credit and payment terms management
- Sales transaction tracking
- Outstanding dues monitoring
- Customer search and filtering

**Key Features:**
- ✅ Auto-generated Customer IDs (CUST-XXXXX format)
- ✅ Transaction-safe operations
- ✅ Advanced search capabilities
- ✅ Sales history tracking
- ✅ Outstanding dues management
- ✅ Customer statistics and analytics

---

## Base URL

```
http://localhost:3000/api/customers
```

---

## Data Models

### Customer Model

The Customer model stores comprehensive customer information including personal details, contact information, and business terms.

#### Schema

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `customer_id` | STRING | Yes | Yes | Auto | Primary key (CUST-XXXXX format) |
| `name` | STRING | Yes | No | - | Customer full name |
| `email` | STRING | No | Yes | - | Email address |
| `phone_number` | STRING | Yes | Yes | - | Primary contact number |
| `atlernative_phone_number` | STRING | No | Yes | - | Secondary contact number |
| `nic_or_passport_number` | STRING | No | Yes | - | National ID or passport number |
| `dob` | DATEONLY | No | No | - | Date of birth |
| `gender` | STRING | No | No | - | Gender |
| `type` | STRING (ENUM) | Yes | No | - | Customer type: 'regular' or 'wholesale' |
| `address` | STRING | No | No | - | Street address |
| `city` | STRING | No | No | - | City |
| `district` | STRING | No | No | - | District/State |
| `postal_code` | STRING | No | No | - | Postal/ZIP code |
| `country` | STRING | No | No | - | Country |
| `credit_limit` | DECIMAL(10,2) | No | No | 0.00 | Maximum credit allowed |
| `credit_days` | INTEGER | No | No | 0 | Credit payment period in days |
| `discount_rate` | DECIMAL(5,2) | No | No | 0.00 | Default discount percentage |
| `prefferred_payment_method` | STRING | No | No | - | Preferred payment method |
| `registration_date` | DATEONLY | Yes | No | NOW | Customer registration date |
| `status` | STRING (ENUM) | Yes | No | 'active' | Status: 'active' or 'inactive' |
| `reffered_by` | STRING | No | No | - | Referral source |
| `note` | TEXT | No | No | - | Additional notes |
| `createdAt` | TIMESTAMP | Auto | No | NOW | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Auto | No | NOW | Last update timestamp |

#### Relationships

```
Customer (1) ──── (Many) Customer_Sales
```

A customer can have multiple sales transactions.

---

### Customer Sales Model

The Customer_Sales model tracks all sales transactions associated with customers, including payment status and outstanding dues.

#### Schema

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | INTEGER | Yes | Yes | Auto | Primary key (auto-increment) |
| `customer_id` | STRING | Yes | No | - | Foreign key to Customer |
| `total_sales_amount` | DECIMAL(10,2) | Yes | No | - | Total amount of the sale |
| `last_sales_date` | DATE | Yes | No | - | Date of the sale |
| `is_due_available` | BOOLEAN | Yes | No | false | Whether payment is pending |
| `paid_amount` | DECIMAL(10,2) | No | No | - | Amount already paid |
| `payment_status` | STRING (ENUM) | Yes | No | - | Status: 'paid', 'pending', or 'overdue' |
| `createdAt` | TIMESTAMP | Auto | No | NOW | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Auto | No | NOW | Last update timestamp |

---

## API Endpoints

### Customer Management

#### 1. Create New Customer

Create a new customer with auto-generated customer ID.

**Endpoint:** `POST /api/customers`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone_number": "0771234567",
  "atlernative_phone_number": "0112345678",
  "nic_or_passport_number": "199012345678",
  "dob": "1990-05-15",
  "gender": "Male",
  "type": "regular",
  "address": "123 Main Street",
  "city": "Colombo",
  "district": "Colombo",
  "postal_code": "00100",
  "country": "Sri Lanka",
  "credit_limit": 50000.00,
  "credit_days": 30,
  "discount_rate": 5.00,
  "prefferred_payment_method": "Credit Card",
  "registration_date": "2026-03-05",
  "status": "active",
  "reffered_by": "Facebook Ad",
  "note": "VIP customer, prefers morning deliveries"
}
```

**Required Fields:**
- `name` - Customer full name
- `phone_number` - Primary contact number
- `type` - Must be either 'regular' or 'wholesale'

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "customer_id": "CUST-00001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "0771234567",
    "atlernative_phone_number": "0112345678",
    "nic_or_passport_number": "199012345678",
    "dob": "1990-05-15",
    "gender": "Male",
    "type": "regular",
    "address": "123 Main Street",
    "city": "Colombo",
    "district": "Colombo",
    "postal_code": "00100",
    "country": "Sri Lanka",
    "credit_limit": "50000.00",
    "credit_days": 30,
    "discount_rate": "5.00",
    "prefferred_payment_method": "Credit Card",
    "registration_date": "2026-03-05",
    "status": "active",
    "reffered_by": "Facebook Ad",
    "note": "VIP customer, prefers morning deliveries",
    "createdAt": "2026-03-05T10:30:00.000Z",
    "updatedAt": "2026-03-05T10:30:00.000Z"
  }
}
```

---

#### 2. Get All Customers

Retrieve all customers with optional filtering and statistics.

**Endpoint:** `GET /api/customers`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | INTEGER | No | 100 | Maximum number of customers to return |
| `type` | STRING | No | - | Filter by customer type ('regular' or 'wholesale') |
| `status` | STRING | No | - | Filter by status ('active' or 'inactive') |

**Example Requests:**

```
GET /api/customers
GET /api/customers?limit=50
GET /api/customers?type=wholesale
GET /api/customers?status=active
GET /api/customers?type=regular&status=active&limit=25
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "customer_id": "CUST-00001",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "0771234567",
      "type": "regular",
      "status": "active",
      "credit_limit": "50000.00",
      "customer_sales": [
        {
          "id": 1,
          "customer_id": "CUST-00001",
          "total_sales_amount": "25000.00",
          "paid_amount": "20000.00",
          "payment_status": "pending",
          "is_due_available": true
        }
      ],
      "createdAt": "2026-03-05T10:30:00.000Z",
      "updatedAt": "2026-03-05T10:30:00.000Z"
    }
  ],
  "stats": {
    "total": 150,
    "active": 135,
    "inactive": 15,
    "regular": 120,
    "wholesale": 30,
    "totalOutstandingDues": 125000.50
  },
  "isAll": true
}
```

**Statistics Included:**
- `total` - Total number of customers retrieved
- `active` - Number of active customers
- `inactive` - Number of inactive customers
- `regular` - Number of regular customers
- `wholesale` - Number of wholesale customers
- `totalOutstandingDues` - Sum of all outstanding dues across customers

---

#### 3. Get Customer by ID

Retrieve detailed information about a specific customer including all sales history.

**Endpoint:** `GET /api/customers/:id`

**URL Parameters:**
- `id` - Customer ID (e.g., CUST-00001)

**Example Request:**

```
GET /api/customers/CUST-00001
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "customer_id": "CUST-00001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "0771234567",
    "atlernative_phone_number": "0112345678",
    "nic_or_passport_number": "199012345678",
    "dob": "1990-05-15",
    "gender": "Male",
    "type": "regular",
    "address": "123 Main Street",
    "city": "Colombo",
    "district": "Colombo",
    "postal_code": "00100",
    "country": "Sri Lanka",
    "credit_limit": "50000.00",
    "credit_days": 30,
    "discount_rate": "5.00",
    "prefferred_payment_method": "Credit Card",
    "registration_date": "2026-03-05",
    "status": "active",
    "reffered_by": "Facebook Ad",
    "note": "VIP customer, prefers morning deliveries",
    "customer_sales": [
      {
        "id": 1,
        "customer_id": "CUST-00001",
        "total_sales_amount": "25000.00",
        "last_sales_date": "2026-03-01T08:00:00.000Z",
        "is_due_available": true,
        "paid_amount": "20000.00",
        "payment_status": "pending",
        "createdAt": "2026-03-01T08:30:00.000Z",
        "updatedAt": "2026-03-01T08:30:00.000Z"
      }
    ],
    "createdAt": "2026-03-05T10:30:00.000Z",
    "updatedAt": "2026-03-05T10:30:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`

```json
{
  "success": false,
  "message": "Customer not found"
}
```

---

#### 4. Search Customers

Search for customers using multiple criteria.

**Endpoint:** `GET /api/customers/search`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | STRING | Yes | Search term |

**Search Fields:**
The search will look for matches in:
- Customer name
- Email address
- Phone number
- Alternative phone number
- NIC or passport number
- Customer ID

**Example Requests:**

```
GET /api/customers/search?query=John
GET /api/customers/search?query=077
GET /api/customers/search?query=CUST-00001
GET /api/customers/search?query=john.doe@example.com
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "customer_id": "CUST-00001",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "0771234567",
      "type": "regular",
      "status": "active",
      "customer_sales": [],
      "createdAt": "2026-03-05T10:30:00.000Z",
      "updatedAt": "2026-03-05T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

**Error Response:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Search query is required"
}
```

---

#### 5. Update Customer

Update customer information. The customer ID cannot be modified.

**Endpoint:** `PUT /api/customers/:id`

**URL Parameters:**
- `id` - Customer ID (e.g., CUST-00001)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

You can update any field except `customer_id`. Include only the fields you want to update.

```json
{
  "email": "john.newemail@example.com",
  "phone_number": "0779876543",
  "credit_limit": 75000.00,
  "discount_rate": 7.50,
  "status": "inactive",
  "note": "Updated customer preferences"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "customer_id": "CUST-00001",
    "name": "John Doe",
    "email": "john.newemail@example.com",
    "phone_number": "0779876543",
    "credit_limit": "75000.00",
    "discount_rate": "7.50",
    "status": "inactive",
    "note": "Updated customer preferences",
    "updatedAt": "2026-03-05T14:20:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`

```json
{
  "success": false,
  "message": "Customer not found"
}
```

---

#### 6. Delete Customer

Permanently delete a customer record.

**Endpoint:** `DELETE /api/customers/:id`

**URL Parameters:**
- `id` - Customer ID (e.g., CUST-00001)

**Example Request:**

```
DELETE /api/customers/CUST-00001
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Customer deleted successfully"
}
```

**Error Response:** `404 Not Found`

```json
{
  "success": false,
  "message": "Customer not found"
}
```

⚠️ **Warning:** Deleting a customer will also delete all associated sales records due to CASCADE delete constraints.

---

#### 7. Get Customers with Outstanding Dues

Retrieve all customers who have pending or overdue payments.

**Endpoint:** `GET /api/customers/dues`

**Example Request:**

```
GET /api/customers/dues
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": "CUST-00001",
      "total_sales_amount": "25000.00",
      "last_sales_date": "2026-03-01T08:00:00.000Z",
      "is_due_available": true,
      "paid_amount": "20000.00",
      "payment_status": "pending",
      "customer": {
        "customer_id": "CUST-00001",
        "name": "John Doe",
        "phone_number": "0771234567",
        "email": "john.doe@example.com",
        "type": "regular",
        "credit_limit": "50000.00",
        "credit_days": 30
      },
      "createdAt": "2026-03-01T08:30:00.000Z",
      "updatedAt": "2026-03-01T08:30:00.000Z"
    }
  ],
  "count": 1
}
```

**Filtering Logic:**
- `is_due_available` = true
- `payment_status` IN ('pending', 'overdue')

---

### Customer Sales Management

#### 8. Get Customer Sales History

Retrieve complete sales history for a specific customer with summary statistics.

**Endpoint:** `GET /api/customers/:id/sales`

**URL Parameters:**
- `id` - Customer ID (e.g., CUST-00001)

**Example Request:**

```
GET /api/customers/CUST-00001/sales
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": "CUST-00001",
      "total_sales_amount": "25000.00",
      "last_sales_date": "2026-03-01T08:00:00.000Z",
      "is_due_available": true,
      "paid_amount": "20000.00",
      "payment_status": "pending",
      "createdAt": "2026-03-01T08:30:00.000Z",
      "updatedAt": "2026-03-01T08:30:00.000Z"
    },
    {
      "id": 2,
      "customer_id": "CUST-00001",
      "total_sales_amount": "15000.00",
      "last_sales_date": "2026-02-15T10:00:00.000Z",
      "is_due_available": false,
      "paid_amount": "15000.00",
      "payment_status": "paid",
      "createdAt": "2026-02-15T10:30:00.000Z",
      "updatedAt": "2026-02-15T10:30:00.000Z"
    }
  ],
  "summary": {
    "totalSales": "40000.00",
    "totalPaid": "35000.00",
    "totalDue": "5000.00",
    "salesCount": 2
  }
}
```

**Error Response:** `404 Not Found`

```json
{
  "success": false,
  "message": "No sales found for this customer"
}
```

---

#### 9. Create Customer Sale Record

Create a new sales transaction record for a customer.

**Endpoint:** `POST /api/customers/sales`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "customer_id": "CUST-00001",
  "total_sales_amount": 50000.00,
  "last_sales_date": "2026-03-05",
  "is_due_available": true,
  "paid_amount": 30000.00,
  "payment_status": "pending"
}
```

**Required Fields:**
- `customer_id` - Must reference an existing customer
- `total_sales_amount` - Total amount of the sale
- `last_sales_date` - Date of the transaction
- `payment_status` - Must be 'paid', 'pending', or 'overdue'

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Customer sale record created successfully",
  "data": {
    "id": 3,
    "customer_id": "CUST-00001",
    "total_sales_amount": "50000.00",
    "last_sales_date": "2026-03-05T00:00:00.000Z",
    "is_due_available": true,
    "paid_amount": "30000.00",
    "payment_status": "pending",
    "createdAt": "2026-03-05T15:00:00.000Z",
    "updatedAt": "2026-03-05T15:00:00.000Z"
  }
}
```

**Error Responses:**

`400 Bad Request` - Missing required fields
```json
{
  "success": false,
  "message": "Customer ID, total sales amount, last sales date, and payment status are required"
}
```

`404 Not Found` - Customer doesn't exist
```json
{
  "success": false,
  "message": "Customer not found"
}
```

---

#### 10. Update Customer Sale

Update an existing sales transaction record.

**Endpoint:** `PUT /api/customers/sales/:id`

**URL Parameters:**
- `id` - Sale record ID (integer)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

Update any field in the sales record:

```json
{
  "paid_amount": 50000.00,
  "payment_status": "paid",
  "is_due_available": false
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Customer sale updated successfully",
  "data": {
    "id": 3,
    "customer_id": "CUST-00001",
    "total_sales_amount": "50000.00",
    "last_sales_date": "2026-03-05T00:00:00.000Z",
    "is_due_available": false,
    "paid_amount": "50000.00",
    "payment_status": "paid",
    "updatedAt": "2026-03-05T16:00:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`

```json
{
  "success": false,
  "message": "Sale record not found"
}
```

---

## Examples

### Complete Customer Lifecycle

#### 1. Create a Wholesale Customer

```bash
POST /api/customers
Content-Type: application/json

{
  "name": "TechMart Electronics",
  "email": "orders@techmart.lk",
  "phone_number": "0112223334",
  "atlernative_phone_number": "0773334445",
  "type": "wholesale",
  "address": "456 Business Park",
  "city": "Kandy",
  "district": "Kandy",
  "postal_code": "20000",
  "country": "Sri Lanka",
  "credit_limit": 500000.00,
  "credit_days": 60,
  "discount_rate": 15.00,
  "prefferred_payment_method": "Bank Transfer",
  "registration_date": "2026-03-05",
  "status": "active",
  "note": "Wholesale partner - monthly settlement"
}
```

#### 2. Record a Sale Transaction

```bash
POST /api/customers/sales
Content-Type: application/json

{
  "customer_id": "CUST-00002",
  "total_sales_amount": 125000.00,
  "last_sales_date": "2026-03-05",
  "is_due_available": true,
  "paid_amount": 0.00,
  "payment_status": "pending"
}
```

#### 3. Check Outstanding Dues

```bash
GET /api/customers/dues
```

#### 4. Update Payment Status

```bash
PUT /api/customers/sales/1
Content-Type: application/json

{
  "paid_amount": 125000.00,
  "payment_status": "paid",
  "is_due_available": false
}
```

#### 5. View Customer History

```bash
GET /api/customers/CUST-00002/sales
```

---

### Advanced Queries

#### Get Active Wholesale Customers

```bash
GET /api/customers?type=wholesale&status=active&limit=50
```

#### Search by Phone Number

```bash
GET /api/customers/search?query=077
```

#### Find Customer by Email

```bash
GET /api/customers/search?query=john@example.com
```

---

## Error Handling

All endpoints follow consistent error response format:

### Error Response Structure

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development mode)"
}
```

### HTTP Status Codes

| Code | Description | Common Scenarios |
|------|-------------|------------------|
| `200` | OK | Successful GET, PUT, DELETE operations |
| `201` | Created | Successful POST operations |
| `400` | Bad Request | Missing required fields, invalid data |
| `404` | Not Found | Customer or sale record not found |
| `500` | Internal Server Error | Database errors, server issues |

### Common Error Scenarios

#### 1. Missing Required Fields

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Name, phone number, and type are required fields"
}
```

#### 2. Customer Not Found

**Status:** `404 Not Found`

```json
{
  "success": false,
  "message": "Customer not found"
}
```

#### 3. Missing Search Query

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Search query is required"
}
```

#### 4. Database Error

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "message": "Error creating customer",
  "error": "Detailed error information"
}
```

### Transaction Safety

All database operations use transactions to ensure data consistency:
- If any part of an operation fails, all changes are rolled back
- No partial updates occur
- Foreign key constraints are maintained

---

## Best Practices

### 1. Customer ID Management
- Customer IDs are auto-generated (CUST-XXXXX format)
- Never attempt to manually set or modify customer IDs
- Use customer IDs for all references and relationships

### 2. Data Validation
- Always validate required fields before submission
- Ensure email format is valid
- Phone numbers should be unique across customers
- Customer type must be either 'regular' or 'wholesale'

### 3. Payment Tracking
- Set `is_due_available` to `true` when payment is incomplete
- Update `payment_status` to reflect current state:
  - `paid` - Fully paid
  - `pending` - Payment due but not overdue
  - `overdue` - Payment past due date
- Always update `paid_amount` when recording payments

### 4. Credit Management
- Monitor customer credit limits before approving sales
- Track outstanding dues using `/api/customers/dues` endpoint
- Update payment terms as needed based on customer relationship

### 5. Search Optimization
- Use specific search terms for better results
- Consider customer type and status filters for targeted queries
- Limit results appropriately to improve performance

---

## Related Documentation

- [Product API Documentation](./Product-API.md)
- [Main README](../README.md)

---

**Last Updated:** March 5, 2026  
**API Version:** 1.0.0  
**Maintained by:** Dr. Mobile POS Development Team
