// backend/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config(); // Add this line to load .env file

const customerRoutes = require("./routes/customers");
const addressRoutes = require("./routes/addresses");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/customers", customerRoutes);
app.use("/api/addresses", addressRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000; // Use environment variable

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
