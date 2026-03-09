# Dr. Mobile POS API

A Node.js Express API with Sequelize ORM and SQLite database for a Point of Sale (POS) system.

## 📚 Documentation

Comprehensive API documentation is available in the `/Documentation` folder:

- **[Product API Documentation](./Documentation/Product-API.md)** - Complete guide for Product and Stock Management APIs
- **[Customer API Documentation](./Documentation/customer-API.md)** - Complete guide for Customer and Sales Management APIs
- **[Vault & Transactions API Documentation](./Documentation/vault-and-transactions-API.md)** - Complete guide for Vault Management and Transaction APIs

## 📋 Table of Contents

- [Documentation](#-documentation)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Health Check](#health-check)
- [API Endpoints](#api-endpoints)
- [Database Models](#database-models)
- [Example Requests](#example-requests)
- [Technologies Used](#technologies-used)
- [License](#license)

## Project Structure

```
app/
├── src/
│   ├── config/
│   │   └── db.config.js           # Database configuration
│   ├── controllers/
│   │   ├── productController.js   # Product & Stock CRUD operations
│   │   ├── customerController.js  # Customer & Sales CRUD operations
│   │   └── vaultController.js     # Vault & Transaction CRUD operations
│   ├── middleware/
│   │   └── errorHandler.js        # Global error handling
│   ├── models/
│   │   ├── index.js               # Model associations & exports
│   │   ├── Product.js             # Product model
│   │   ├── productStock.js        # Product_Stock model
│   │   ├── stockIssues.js         # Stock_Issues model
│   │   ├── customer.js            # Customer model
│   │   ├── customerSales.js       # Customer_Sales model
│   │   ├── account.js             # Account (Vault) model
│   │   ├── bankAcc.js             # Bank Account model
│   │   ├── drawerAcc.js           # Drawer Account model
│   │   ├── trasactions.js         # Transaction model
│   │   └── id.js                  # ID generation utilities
│   ├── routes/
│   │   ├── products.js            # Product API routes
│   │   ├── customers.js           # Customer API routes
│   │   └── vault.js               # Vault API routes
│   └── helpers/
│       └── idGen.js               # Universal ID generator
├── Documentation/                  # 📚 API Documentation
│   ├── Product-API.md             # Product & Stock API docs
│   ├── customer-API.md            # Customer & Sales API docs
│   └── vault-and-transactions-API.md  # Vault & Transaction API docs
├── data/                           # SQLite database folder
│   └── database.db                # SQLite database file
├── app.js                          # Express app setup
├── server.js                       # Server entry point
├── package.json                    # Dependencies & scripts
├── .env                            # Environment variables
├── .gitignore                      # Git ignore patterns
└── README.md                       # Project documentation
```

## Installation

1. Navigate to the app directory:
```bash
cd "Dr.Mobile POS/app"
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The `.env` file contains environment variables:
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database path (default: ./data/database.db)

## Running the Application

**Development mode** (with auto-reload using nodemon):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## Health Check

Verify the API is running:
```bash
GET http://localhost:3000/api/health
```

## API Endpoints

### Product & Stock Management
- `POST /api/products` - Create new product with stock information
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/search` - Search products

**📖 For detailed Product API documentation, see [Product-API.md](./Documentation/Product-API.md)**

### Customer & Sales Management
- `POST /api/customers` - Create new customer
- `GET /api/customers` - Get all customers with filters and statistics
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/search` - Search customers
- `GET /api/customers/dues` - Get customers with outstanding dues
- `GET /api/customers/:id/sales` - Get customer sales history
- `POST /api/customers/sales` - Create customer sale record
- `PUT /api/customers/sales/:id` - Update customer sale

**📖 For detailed Customer API documentation, see [customer-API.md](./Documentation/customer-API.md)**

### Vault & Transaction Management
- `POST /api/vault` - Create new vault (bank or drawer)
- `GET /api/vault/balance` - Get total vault balance summary
- `GET /api/vault/bank/:bank_acc_id` - Get bank account details
- `PUT /api/vault/bank/:bank_acc_id` - Update bank account
- `DELETE /api/vault/bank/:bank_acc_id` - Delete bank account
- `GET /api/vault/drawer/:drawer_acc_id` - Get drawer account details
- `PUT /api/vault/drawer/:drawer_acc_id` - Update drawer account
- `DELETE /api/vault/drawer/:drawer_acc_id` - Delete drawer account
- `POST /api/vault/transactions` - Create new transaction
- `GET /api/vault/transactions` - Get all transactions (paginated)
- `GET /api/vault/transactions/account/:account_id` - Get transaction history
- `PUT /api/vault/transactions/:transaction_id` - Update transaction
- `DELETE /api/vault/transactions/:transaction_id` - Delete transaction

**📖 For detailed Vault & Transactions API documentation, see [vault-and-transactions-API.md](./Documentation/vault-and-transactions-API.md)**

## Database Models

The system uses comprehensive models for product, inventory, and customer management:

### Product
Primary product information including specifications and unique identifiers.

**Key Fields:**
- `id` (String, Primary Key) - Auto-generated (PROD-XXXXX format)
- `productName` (String, Required)
- `price` (Decimal, Required)
- `brand` (String, Required)
- `IMEI` (String, Unique)
- `barcode` (String, Unique)
- `serialNumber` (String, Unique)

**Full Schema:** See [Product-API.md](./Documentation/Product-API.md#product-model)

### Product_Stock
Inventory and pricing information linked to products.

**Key Fields:**
- `product_id` (Foreign Key to Product)
- `sku` (String, Unique, Required)
- `cost_price` (Decimal, Required)
- `selling_price` (Decimal, Required)
- `status` (Enum: active, inactive, discontinued, in_stock, sold)

**Full Schema:** See [Product-API.md](./Documentation/Product-API.md#product-stock-model)

### Stock_Issues
Tracks product issuance and sales transactions.

**Key Fields:**
- `product_id` (Foreign Key to Product)
- `issued_to` (String, Required)
- `issued_date` (Date)
- `status` (Enum: pending, completed, cancelled)

**Full Schema:** See [Product-API.md](./Documentation/Product-API.md#stock-issues-model)

### Customer
Stores comprehensive customer information and business terms.

**Key Fields:**
- `customer_id` (String, Primary Key) - Auto-generated (CUST-XXXXX format)
- `name` (String, Required)
- `phone_number` (String, Required, Unique)
- `email` (String, Unique)
- `type` (Enum: regular, wholesale)
- `credit_limit` (Decimal)
- `status` (Enum: active, inactive)

**Full Schema:** See [customer-API.md](./Documentation/customer-API.md#customer-model)

### Customer_Sales
Tracks all sales transactions and payment status.

**Key Fields:**
- `id` (Integer, Primary Key)
- `customer_id` (Foreign Key to Customer)
- `total_sales_amount` (Decimal, Required)
- `paid_amount` (Decimal)
- `payment_status` (Enum: paid, pending, overdue)
- `is_due_available` (Boolean)

**Full Schema:** See [customer-API.md](./Documentation/customer-API.md#customer-sales-model)

### Account (Vault)
Manages vault accounts for both bank and cash drawer operations.

**Key Fields:**
- `acc_id` (String, Primary Key) - Auto-generated (ACCOUNT_XXX format)
- `type` (Enum: bank, drawer)
- `available_balance` (Decimal)

**Full Schema:** See [vault-and-transactions-API.md](./Documentation/vault-and-transactions-API.md#data-models)

### Bank Account
Stores bank account details linked to vault accounts.

**Key Fields:**
- `bank_acc_id` (String, Primary Key) - Auto-generated (BANK_XXX format)
- `acc_id` (Foreign Key to Account)
- `bank_name` (String, Required)
- `account_number` (String, Required)
- `account_holder_name` (String, Required)

**Full Schema:** See [vault-and-transactions-API.md](./Documentation/vault-and-transactions-API.md#data-models)

### Drawer Account
Manages cash drawer accounts linked to vault accounts.

**Key Fields:**
- `drawer_acc_id` (String, Primary Key) - Auto-generated (DRAWER_XXX format)
- `acc_id` (Foreign Key to Account)
- `name` (String, Required)
- `location` (String, Required)

**Full Schema:** See [vault-and-transactions-API.md](./Documentation/vault-and-transactions-API.md#data-models)

### Transaction
Records all financial transactions (credits and debits) for vault accounts.

**Key Fields:**
- `transaction_id` (String, Primary Key) - Auto-generated (TRANS_XXX format)
- `account_id` (Foreign Key to Account)
- `type` (Enum: credit, debit)
- `amount` (Decimal, Required)
- `transaction_date` (Date)
- `account_balance_before` (Decimal)
- `account_balance_after` (Decimal)

**Full Schema:** See [vault-and-transactions-API.md](./Documentation/vault-and-transactions-API.md#data-models)

```json
POST /api/products
Content-Type: application/json

{
  "productName": "iPhone 15 Pro Max",
  "description": "Latest flagship iPhone",
  "price": 1199.99,
  "brand": "Apple",
  "model": "A2849",
  "color": "Natural Titanium",
  "capacity": "256GB",
  "condition": "New",
  "warrenty": "1 Year Apple Warranty",
  "IMEI": "359876543210987",
  "barcode": "EAN13-00001",
  "serialNumber": "ABCD-1234-EFGH",
  "sku": "IPH15PM-256-NTT",
  "cost_price": 999.00,
  "selling_price": 1199.99,
  "profit_margin": 20.08,
  "supplier": "Apple Inc.",
  "minimum_stock_level": 5,
  "storage_location": "Warehouse A - Shelf 12",
  "status": "in_stock"
}
```

**📖 More examples:** [Product-API.md](./Documentation/Product-API.md#examples)

### Create Customer

```json
POST /api/customers
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone_number": "0771234567",
  "type": "regular",
  "address": "123 Main Street",
  "city": "Colombo",
  "credit_limit": 50000.00,
  "credit_days": 30,
  "discount_rate": 5.00,
  "status": "active"
}
```

**📖 More examples:** [customer-API.md](./Documentation/customer-API.md#examples)

## Technologies Used

- **Express.js** v4.18.2 - Web framework
- **Sequelize** v6.35.1 - ORM for database management
- **SQLite3** v5.1.6 - Lightweight SQL database
- **dotenv** v16.3.1 - Environment variable management
- **cors** v2.8.5 - Cross-origin resource sharing
- **body-parser** v1.20.2 - JSON request parsing
- **nodemon** v3.0.2 - Development auto-reload

## Key Features

✅ **Transaction Safety** - Atomic operations ensure data consistency  
✅ **Auto ID Generation** - Products (PROD-XXXXX) and Customers (CUST-XXXXX) get unique IDs  
✅ **Stock Management** - Integrated inventory tracking with products  
✅ **Customer Management** - Comprehensive CRM with credit and sales tracking  
✅ **Cascade Operations** - Foreign key relationships with CASCADE delete  
✅ **Status Tracking** - Product and customer lifecycle management  
✅ **Unique Constraints** - IMEI, SKU, barcode, serial number, and customer contact validation  
✅ **Advanced Search** - Multi-field search for products and customers  
✅ **Due Management** - Track and monitor outstanding customer payments

## Contributing

When adding new features or endpoints, please:
1. Update the relevant controller in `/src/controllers`
2. Add routes in `/src/routes`
3. Create comprehensive documentation in `/Documentation`
4. Update this README with links to new documentation

## Documentation Standards

All API endpoints should be documented following the format in [Product-API.md](./Documentation/Product-API.md) and [customer-API.md](./Documentation/customer-API.md):
- Complete model schemas
- Request/response examples
- Error handling details
- Status codes and scenarios
- Relationship diagrams where applicable

## License

ISC

---

**Last Updated:** March 5, 2026  
**Version:** 1.0.0