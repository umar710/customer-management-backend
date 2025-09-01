# Backend API — Customer Management System

## 🔗 Quick Links
- **Frontend (Local)**: http://localhost:3000  
- **Backend (Local)**: http://localhost:5000  
- **Deployed Customers API**: https://customer-management-backend-1-kby9.onrender.com/api/customers  
- **Deployed Addresses API**: https://customer-management-backend-1-kby9.onrender.com/api/addresses  
- **Postman Collection**: _(Add link if exported)_  
- **API Docs (Swagger/OpenAPI)**: _(Optional if generated)_  

---

## 🚀 Overview
A lightweight RESTful API built with Node.js and Express that stores customer and address data in SQLite.  
Features include: CRUD for customers & addresses, pagination, search/filtering, CORS for frontend integration, automatic DB schema creation, and helpful error handling.

**Base URL (local)**: `http://localhost:5000`  

---

## ✅ Features
- RESTful routes for Customers & Addresses  
- SQLite DB with automatic table creation on startup  
- Pagination, search and filter-by-location endpoints  
- Request validation and descriptive error messages  
- CORS enabled for frontend integration  
- Simple setup, works with `npm run dev` (nodemon)

---

## 📦 Requirements
- Node.js v14+  
- npm or yarn  

---

## 🛠️ Quick Setup

```bash
# move into backend folder
cd customer-management/backend

# install dependencies
npm install

# run in development (nodemon)
npm run dev

# run in production
npm start
````

By default the server listens on `http://localhost:5000`.

---

## 🔧 Environment Configuration

Create a `.env` file in the `backend/` folder (optional — defaults are set):

```env
PORT=5000
DB_PATH=./database/customers.db
NODE_ENV=development
```

---

## 📁 Project Structure

```
backend/
├── models/
│   └── database.js       # DB connection, schema creation
├── routes/
│   ├── customers.js      # Customer routes & handlers
│   └── addresses.js      # Address routes & handlers
├── database/
│   └── customers.db      # SQLite DB (auto-created)
├── .env                  # Environment variables (optional)
├── app.js                # Main Express app
└── package.json          # Scripts & dependencies
```

---

## 🧾 Database Schema

### `customers` table

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `addresses` table

```sql
CREATE TABLE addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId INTEGER NOT NULL,
  addressLine1 TEXT NOT NULL,
  addressLine2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pinCode TEXT NOT NULL,
  isPrimary BOOLEAN DEFAULT 0,
  FOREIGN KEY (customerId) REFERENCES customers (id) ON DELETE CASCADE
);
```

---

## 🔁 API Endpoints

### Customers

| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/customers`     | List customers (pagination & search) |
| GET    | `/api/customers/:id` | Get a customer with addresses        |
| POST   | `/api/customers`     | Create a new customer                |
| PUT    | `/api/customers/:id` | Update customer                      |
| DELETE | `/api/customers/:id` | Delete customer                      |

### Addresses

| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/addresses`     | List addresses (filtering available) |
| GET    | `/api/addresses/:id` | Get address by ID                    |
| POST   | `/api/addresses`     | Create address                       |
| PUT    | `/api/addresses/:id` | Update address                       |
| DELETE | `/api/addresses/:id` | Delete address                       |

### Filtering

| Method | Endpoint                            | Description                                            |
| ------ | ----------------------------------- | ------------------------------------------------------ |
| GET    | `/api/customers/filter-by-location` | Filter customers by `city` and/or `state` query params |

---

## 🔍 Query params & Examples

### Pagination & search (customers)

```
GET /api/customers?page=1&limit=10&search=john
```

### Filter by location

```
GET /api/customers/filter-by-location?city=Mehkar&state=Maharashtra
```

---

## ✉️ Request Examples (curl)

### Create a customer

```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"John",
    "lastName":"Doe",
    "email":"john.doe@example.com",
    "phone":"1234567890"
  }'
```

### Create an address

```bash
curl -X POST http://localhost:5000/api/addresses \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "Mehkar",
    "state": "Maharashtra",
    "pinCode": "443301",
    "isPrimary": true
  }'
```

### Get paginated customers

```bash
curl "http://localhost:5000/api/customers?page=1&limit=10"
```

---

## 🔒 Validation Rules

### Customer

* `firstName`: required
* `lastName`: required
* `phone`: required, unique, 10 digits (validate on API)
* `email`: optional, if provided must be valid

### Address

* `customerId`: required, must reference an existing customer
* `addressLine1`: required
* `city`: required
* `state`: required
* `pinCode`: required, 6 digits

---

## 📦 Response Formats

### Success (list with pagination)

```json
{
  "customers": [ /* array of customers */ ],
  "totalPages": 1,
  "currentPage": 1,
  "totalCount": 0
}
```

### Error

```json
{
  "error": "Short error message",
  "message": "Detailed error explanation"
}
```

---

## 🐞 Troubleshooting

**Port already in use**

* Change `.env` `PORT` or use a different port:

```env
PORT=5001
```

**CORS errors**

* Ensure frontend origin is enabled in backend `cors()` config and backend is running on the expected port.

**Database file not created**

* Ensure `database/` folder exists and is writable. On Unix:

```bash
mkdir -p database
chmod 755 database
```

**Database reset**

* Remove DB file and restart:

```bash
rm database/customers.db
npm start
```

---

## 🧪 Tests

* `npm test` — run tests if tests are configured. (Add tests using a test runner like Jest / Supertest for API endpoints.)

---

## ♻️ Deployment

* This app can be deployed to platforms like Render, Heroku, Railway, or any server that supports Node.js.
* Example (already deployed):

  * Customers: [https://customer-management-backend-1-kby9.onrender.com/api/customers](https://customer-management-backend-1-kby9.onrender.com/api/customers)
  * Addresses: [https://customer-management-backend-1-kby9.onrender.com/api/addresses](https://customer-management-backend-1-kby9.onrender.com/api/addresses)

---

## 🤝 Contribution

Contributions welcome! Suggested steps:

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m "feat: description"`
4. Push: `git push origin feat/your-feature`
5. Create a PR with description & screenshots (if UI)

---

## 📄 License

Add a `LICENSE` file as needed (e.g., MIT). Example:

```
MIT License
```

---

## 📞 Support

If you hit issues:

1. Re-check logs in terminal
2. Verify `.env` and `DB_PATH`
3. Confirm `database/` directory exists and is writable
4. Share the error message when asking for help

---

```
