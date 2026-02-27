# Dr. Mobile POS API

A Node.js Express API with Sequelize ORM and SQLite database for a Point of Sale (POS) system.

## 📚 Documentation

Comprehensive API documentation is available in the `/Documentation` folder:

- **[Product API Documentation](./Documentation/Product-API.md)** - Complete guide for Product and Stock Management APIs

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
│   │   └── productController.js   # Product & Stock CRUD operations
│   ├── middleware/
│   │   └── errorHandler.js        # Global error handling
│   ├── models/
│   │   ├── index.js               # Model associations & exports
│   │   ├── Product.js             # Product model
│   │   ├── productStock.js        # Product_Stock model
│   │   ├── stockIssues.js         # Stock_Issues model
│   │   └── id.js                  # ID generation utilities
│   ├── routes/
│   │   └── products.js            # Product API routes
│   └── helpers/
│       └── idGen.js               # Product ID generator
├── Documentation/                  # 📚 API Documentation
│   └── Product-API.md             # Product & Stock API docs
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
 & Stock Management
- `POST /api/products` - Create new product with stock information

**📖 For detailed Product API documentation, see [Product-API.md](./Documentation/Product-API.md)**

*Note: Additional endpoints (GET, PUT, DELETE) are planned for future implementation.*
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

## Database Models

### Product
- `id` (Integer, Primary Key)
- `name` (String, Required, Unique)
- `description` (Text)
- `price` (Decimal, Required)
- `quantity` (Integer)
- `sku` (String, Unique)
- `category` (String)
- `isActive` (Boolean, Default: true)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### Customer
- `id` (Integer, Primary Key)
The system uses three main models for product and inventory management:

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
- `status` (Enum: pe with Stock

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

**📖 More examples and detailed request/response formats:** [Product-API.md](./Documentation/Product-API.md#examples)*Express.js** - Web framework
- **Sequelize** - ORM for database management
- **SQLite3** - Lv4.18.2 - Web framework
- **Sequelize** v6.35.1 - ORM for database management
- **SQLite3** v5.1.6 - Lightweight SQL database
- **dotenv** v16.3.1 - Environment variable management
- **cors** v2.8.5 - Cross-origin resource sharing
- **body-parser** v1.20.2 - JSON request parsing
- **nodemon** v3.0.2 - Development auto-reload

## Key Features

✅ **Transaction Safety** - Atomic operations ensure data consistency  
✅ **Auto ID Generation** - Products get unique IDs (PROD-XXXXX format)  
✅ **Stock Management** - Integrated inventory tracking with products  
✅ **Cascade Operations** - Foreign key relationships with CASCADE delete  
✅ **Status Tracking** - Product lifecycle management (active → in_stock → sold)  
✅ **Unique Constraints** - IMEI, SKU, barcode, and serial number validation

## Contributing

When adding new features or endpoints, please:
1. Update the relevant controller in `/src/controllers`
2. Add routes in `/src/routes`
3. Create comprehensive documentation in `/Documentation`
4. Update this README with links to new documentation

## Documentation Standards

All API endpoints should be documented following the format in [Product-API.md](./Documentation/Product-API.md):
- Complete model schemas
- Request/response examples
- Error handling details
- Status codes and scenarios
- Relationship diagrams where applicable

## License

ISC

---

**Last Updated:** February 27, 2026  
**Version:** 1.0.0