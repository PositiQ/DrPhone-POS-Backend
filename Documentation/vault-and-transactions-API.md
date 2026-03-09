# Vault and Transactions API Documentation

This API manages vault accounts (bank and drawer accounts) and their associated transactions for the Dr.Mobile POS system.

---

## Base URL
```
http://localhost:3000/api/vault
```

---

## Table of Contents
1. [Vault Management](#vault-management)
   - [Create New Vault](#1-create-new-vault)
   - [Get Total Vault Balance](#2-get-total-vault-balance)
2. [Bank Account Operations](#bank-account-operations)
   - [Get Bank Account](#3-get-bank-account)
   - [Update Bank Account](#4-update-bank-account)
   - [Delete Bank Account](#5-delete-bank-account)
3. [Drawer Account Operations](#drawer-account-operations)
   - [Get Drawer Account](#6-get-drawer-account)
   - [Update Drawer Account](#7-update-drawer-account)
   - [Delete Drawer Account](#8-delete-drawer-account)
4. [Transaction Management](#transaction-management)
   - [Create New Transaction](#9-create-new-transaction)
   - [Get All Transactions](#10-get-all-transactions)
   - [Get Transaction History](#11-get-transaction-history-by-account)
   - [Update Transaction](#12-update-transaction)
   - [Delete Transaction](#13-delete-transaction)

---

## Vault Management

### 1. Create New Vault
Create a new bank or drawer vault account.

**Endpoint:** `POST /api/vault`

**Request Body (Bank):**
```json
{
  "type": "bank",
  "bank_name": "ABC Bank",
  "branch_name": "Main Branch",
  "account_number": "1234567890",
  "account_holder_name": "John Doe"
}
```

**Request Body (Drawer):**
```json
{
  "type": "drawer",
  "drawer_name": "Cash Counter 1",
  "drawer_location": "Front Desk"
}
```

**Success Response (Bank):**
- **Status Code:** 201
```json
{
  "success": true,
  "message": "Bank vault created successfully",
  "vault": {
    "acc_id": "ACCOUNT_001",
    "type": "bank",
    "available_balance": 0.0,
    "bank_acc_id": "BANK_001",
    "bank_name": "ABC Bank",
    "branch_name": "Main Branch",
    "account_number": "1234567890",
    "account_holder_name": "John Doe",
    "added_date": "2026-03-09T10:30:00.000Z"
  }
}
```

**Success Response (Drawer):**
- **Status Code:** 201
```json
{
  "success": true,
  "message": "Drawer vault created successfully",
  "vault": {
    "acc_id": "ACCOUNT_002",
    "type": "drawer",
    "available_balance": 0.0,
    "drawer_acc_id": "DRAWER_001",
    "name": "Cash Counter 1",
    "location": "Front Desk",
    "added_date": "2026-03-09T10:30:00.000Z"
  }
}
```

**Error Responses:**
- **Status Code:** 400
```json
{
  "success": false,
  "error": "Vault type is required"
}
```
```json
{
  "success": false,
  "error": "Invalid vault type. Must be 'bank' or 'drawer'"
}
```

---

### 2. Get Total Vault Balance
Get the total balance across all vaults with credit/debit summary.

**Endpoint:** `GET /api/vault/balance`

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "totalBalance": 25000.50,
  "totalCredit": 50000.00,
  "totalDebit": 24999.50
}
```

**Error Response:**
- **Status Code:** 500
```json
{
  "success": false,
  "error": "Failed to fetch total vault balance"
}
```

---

## Bank Account Operations

### 3. Get Bank Account
Retrieve details of a specific bank account.

**Endpoint:** `GET /api/vault/bank/:bank_acc_id`

**URL Parameters:**
- `bank_acc_id` (string, required) - Bank account ID

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "vault": {
    "bank_acc_id": "BANK_001",
    "acc_id": "ACCOUNT_001",
    "bank_name": "ABC Bank",
    "branch_name": "Main Branch",
    "account_number": "1234567890",
    "account_holder_name": "John Doe",
    "added_date": "2026-03-09T10:30:00.000Z",
    "account": {
      "acc_id": "ACCOUNT_001",
      "type": "bank",
      "available_balance": 5000.00
    }
  }
}
```

**Error Response:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Bank account not found"
}
```

---

### 4. Update Bank Account
Update bank account information.

**Endpoint:** `PUT /api/vault/bank/:bank_acc_id`

**URL Parameters:**
- `bank_acc_id` (string, required) - Bank account ID

**Request Body:**
```json
{
  "bank_name": "XYZ Bank",
  "branch_name": "Downtown Branch",
  "account_number": "9876543210",
  "account_holder_name": "Jane Smith"
}
```

*Note: All fields are optional. Only include fields you want to update.*

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "message": "Bank account updated successfully",
  "vault": {
    "bank_acc_id": "BANK_001",
    "acc_id": "ACCOUNT_001",
    "bank_name": "XYZ Bank",
    "branch_name": "Downtown Branch",
    "account_number": "9876543210",
    "account_holder_name": "Jane Smith",
    "added_date": "2026-03-09T10:30:00.000Z"
  }
}
```

**Error Response:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Bank account not found"
}
```

---

### 5. Delete Bank Account
Delete a bank account and its associated vault account.

**Endpoint:** `DELETE /api/vault/bank/:bank_acc_id`

**URL Parameters:**
- `bank_acc_id` (string, required) - Bank account ID

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "message": "Bank account deleted successfully"
}
```

**Error Responses:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Bank account not found"
}
```
- **Status Code:** 400
```json
{
  "success": false,
  "error": "Cannot delete bank account with existing transactions"
}
```

---

## Drawer Account Operations

### 6. Get Drawer Account
Retrieve details of a specific drawer account.

**Endpoint:** `GET /api/vault/drawer/:drawer_acc_id`

**URL Parameters:**
- `drawer_acc_id` (string, required) - Drawer account ID

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "vault": {
    "drawer_acc_id": "DRAWER_001",
    "acc_id": "ACCOUNT_002",
    "name": "Cash Counter 1",
    "location": "Front Desk",
    "added_date": "2026-03-09T10:30:00.000Z",
    "account": {
      "acc_id": "ACCOUNT_002",
      "type": "drawer",
      "available_balance": 2500.00
    }
  }
}
```

**Error Response:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Drawer account not found"
}
```

---

### 7. Update Drawer Account
Update drawer account information.

**Endpoint:** `PUT /api/vault/drawer/:drawer_acc_id`

**URL Parameters:**
- `drawer_acc_id` (string, required) - Drawer account ID

**Request Body:**
```json
{
  "name": "Cash Counter 2",
  "location": "Back Office"
}
```

*Note: All fields are optional. Only include fields you want to update.*

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "message": "Drawer account updated successfully",
  "vault": {
    "drawer_acc_id": "DRAWER_001",
    "acc_id": "ACCOUNT_002",
    "name": "Cash Counter 2",
    "location": "Back Office",
    "added_date": "2026-03-09T10:30:00.000Z"
  }
}
```

**Error Response:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Drawer account not found"
}
```

---

### 8. Delete Drawer Account
Delete a drawer account and its associated vault account.

**Endpoint:** `DELETE /api/vault/drawer/:drawer_acc_id`

**URL Parameters:**
- `drawer_acc_id` (string, required) - Drawer account ID

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "message": "Drawer account deleted successfully"
}
```

**Error Responses:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Drawer account not found"
}
```
- **Status Code:** 400
```json
{
  "success": false,
  "error": "Cannot delete drawer account with existing transactions"
}
```

---

## Transaction Management

### 9. Create New Transaction
Create a new credit or debit transaction for an account.

**Endpoint:** `POST /api/vault/transactions`

**Request Body:**
```json
{
  "account_id": "ACCOUNT_001",
  "type": "credit",
  "amount": 1000.00,
  "description": "Initial deposit"
}
```

**Fields:**
- `account_id` (string, required) - Account ID
- `type` (string, required) - Transaction type: "credit" or "debit"
- `amount` (number, required) - Transaction amount
- `description` (string, optional) - Transaction description

**Success Response:**
- **Status Code:** 201
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "transaction": {
    "transaction_id": "TRANS_001",
    "acc_id": "ACCOUNT_001",
    "type": "credit",
    "amount": 1000.00,
    "description": "Initial deposit",
    "date": "2026-03-09T10:30:00.000Z"
  },
  "updated_balance": 1000.00
}
```

**Error Responses:**
- **Status Code:** 400
```json
{
  "success": false,
  "error": "Account ID, type, and amount are required"
}
```
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Account not found"
}
```

---

### 10. Get All Transactions
Retrieve all transactions with pagination.

**Endpoint:** `GET /api/vault/transactions`

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "totalRecords": 250,
  "totalPages": 3,
  "currentPage": 1,
  "transactions": [
    {
      "transaction_id": "TRANS_001",
      "account_id": "ACCOUNT_001",
      "type": "credit",
      "amount": 1000.00,
      "description": "Initial deposit",
      "transaction_date": "2026-03-09T10:30:00.000Z",
      "account_balance_before": 0.00,
      "account_balance_after": 1000.00
    }
  ]
}
```

*Note: Returns up to 100 transactions per page.*

**Error Response:**
- **Status Code:** 500
```json
{
  "success": false,
  "error": "Failed to fetch transactions"
}
```

---

### 11. Get Transaction History by Account
Retrieve transaction history for a specific account with pagination.

**Endpoint:** `GET /api/vault/transactions/account/:account_id`

**URL Parameters:**
- `account_id` (string, required) - Account ID

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "totalRecords": 45,
  "totalPages": 1,
  "currentPage": 1,
  "transactions": [
    {
      "transaction_id": "TRANS_003",
      "account_id": "ACCOUNT_001",
      "type": "debit",
      "amount": 500.00,
      "description": "Withdrawal",
      "transaction_date": "2026-03-09T14:00:00.000Z",
      "account_balance_before": 1000.00,
      "account_balance_after": 500.00
    },
    {
      "transaction_id": "TRANS_001",
      "account_id": "ACCOUNT_001",
      "type": "credit",
      "amount": 1000.00,
      "description": "Initial deposit",
      "transaction_date": "2026-03-09T10:30:00.000Z",
      "account_balance_before": 0.00,
      "account_balance_after": 1000.00
    }
  ]
}
```

*Note: Transactions are sorted by date (most recent first). Returns up to 100 transactions per page.*

**Error Responses:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Account not found"
}
```
- **Status Code:** 500
```json
{
  "success": false,
  "error": "Failed to fetch transaction history"
}
```

---

### 12. Update Transaction
Update transaction details and recalculate account balance.

**Endpoint:** `PUT /api/vault/transactions/:transaction_id`

**URL Parameters:**
- `transaction_id` (string, required) - Transaction ID

**Request Body:**
```json
{
  "amount": 1500.00,
  "type": "credit",
  "description": "Updated deposit amount"
}
```

*Note: All fields are optional. Only include fields you want to update.*

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "message": "Transaction updated successfully",
  "transaction": {
    "transaction_id": "TRANS_001",
    "account_id": "ACCOUNT_001",
    "type": "credit",
    "amount": 1500.00,
    "description": "Updated deposit amount",
    "transaction_date": "2026-03-09T10:30:00.000Z",
    "account_balance_before": 0.00,
    "account_balance_after": 1500.00
  },
  "updated_balance": 1500.00
}
```

**Error Responses:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Transaction not found"
}
```
```json
{
  "success": false,
  "error": "Associated account not found"
}
```

**Important Notes:**
- Updating a transaction will automatically reverse the old transaction from the account balance and apply the new values.
- The account balance is recalculated to maintain accuracy.

---

### 13. Delete Transaction
Delete a transaction and reverse its effect on the account balance.

**Endpoint:** `DELETE /api/vault/transactions/:transaction_id`

**URL Parameters:**
- `transaction_id` (string, required) - Transaction ID

**Success Response:**
- **Status Code:** 200
```json
{
  "success": true,
  "message": "Transaction deleted successfully",
  "updated_balance": 500.00
}
```

**Error Responses:**
- **Status Code:** 404
```json
{
  "success": false,
  "error": "Transaction not found"
}
```
```json
{
  "success": false,
  "error": "Associated account not found"
}
```

**Important Notes:**
- Deleting a transaction will automatically reverse its effect on the account balance.
- Credit transactions will be subtracted from the balance, debit transactions will be added back.

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes:
- **200 OK** - Request succeeded
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid input or validation error
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

---

## Data Models

### Account (Vault)
```javascript
{
  acc_id: String,         // Unique account ID
  type: String,           // "bank" or "drawer"
  available_balance: Float // Current balance
}
```

### Bank Account
```javascript
{
  bank_acc_id: String,         // Unique bank account ID
  acc_id: String,              // Associated account ID
  bank_name: String,           // Name of bank
  branch_name: String,         // Branch name
  account_number: String,      // Bank account number
  account_holder_name: String, // Account holder name
  added_date: Date             // Date added
}
```

### Drawer Account
```javascript
{
  drawer_acc_id: String,  // Unique drawer account ID
  acc_id: String,         // Associated account ID
  name: String,           // Drawer name
  location: String,       // Physical location
  added_date: Date        // Date added
}
```

### Transaction
```javascript
{
  transaction_id: String,        // Unique transaction ID
  account_id: String,            // Associated account ID
  type: String,                  // "credit" or "debit"
  amount: Float,                 // Transaction amount
  description: String,           // Transaction description
  transaction_date: Date,        // Transaction date
  account_balance_before: Float, // Balance before transaction
  account_balance_after: Float   // Balance after transaction
}
```

---

## Usage Examples

### Example 1: Creating a Bank Vault and Adding Funds
```bash
# 1. Create bank vault
curl -X POST http://localhost:3000/api/vault \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bank",
    "bank_name": "ABC Bank",
    "branch_name": "Main Branch",
    "account_number": "1234567890",
    "account_holder_name": "John Doe"
  }'

# 2. Add transaction (credit)
curl -X POST http://localhost:3000/api/vault/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "ACCOUNT_001",
    "type": "credit",
    "amount": 5000.00,
    "description": "Initial deposit"
  }'
```

### Example 2: Checking Total Balance
```bash
curl -X GET http://localhost:3000/api/vault/balance
```

### Example 3: Update Transaction
```bash
curl -X PUT http://localhost:3000/api/vault/transactions/TRANS_001 \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 6000.00,
    "description": "Corrected deposit amount"
  }'
```

---

## Notes

1. **Transaction Types:**
   - `credit` - Increases account balance (deposits, income)
   - `debit` - Decreases account balance (withdrawals, expenses)

2. **Pagination:**
   - Default page size is 100 records
   - Use the `page` query parameter to navigate through results

3. **Account Deletion:**
   - Cannot delete accounts with existing transactions
   - Delete or reassign transactions first before deleting accounts

4. **Balance Integrity:**
   - All transaction operations (create, update, delete) automatically update account balances
   - The system maintains balance history through `account_balance_before` and `account_balance_after` fields

5. **ID Generation:**
   - IDs are automatically generated using the `idGen` helper
   - Format: `PREFIX_XXX` (e.g., ACCOUNT_001, TRANS_001)

---

*API Version: 1.0*  
*Last Updated: March 9, 2026*
