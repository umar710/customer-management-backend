// backend/routes/customers.js
const express = require("express");
const db = require("../models/database");
const router = express.Router();

// backend/routes/customers.js - Update the GET /api/customers endpoint
router.get("/", (req, res) => {
  const { page = 1, limit = 10, search, city, state, pinCode } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT c.*, 
           COUNT(a.id) as addressCount
    FROM customers c
    LEFT JOIN addresses a ON c.id = a.customerId
  `;

  let conditions = [];
  let params = [];

  if (search) {
    conditions.push(
      `(c.firstName LIKE ? OR c.lastName LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (city) {
    conditions.push(`a.city LIKE ?`);
    params.push(`%${city}%`);
  }

  if (state) {
    conditions.push(`a.state LIKE ?`);
    params.push(`%${state}%`);
  }

  if (pinCode) {
    conditions.push(`a.pinCode LIKE ?`);
    params.push(`%${pinCode}%`);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` GROUP BY c.id ORDER BY c.id LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get addresses for each customer
    const getAddressesForCustomers = rows.map((customer) => {
      return new Promise((resolve, reject) => {
        db.all(
          `SELECT * FROM addresses WHERE customerId = ?`,
          [customer.id],
          (err, addresses) => {
            if (err) {
              reject(err);
            } else {
              // Create a cities string from all addresses
              const cities = addresses
                .map((addr) => addr.city)
                .filter((city) => city)
                .join(", ");
              resolve({
                ...customer,
                addresses: addresses || [],
                cities: cities || "No addresses",
              });
            }
          }
        );
      });
    });

    // Wait for all address queries to complete
    Promise.all(getAddressesForCustomers)
      .then((customersWithAddresses) => {
        // Get total count for pagination
        let countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM customers c LEFT JOIN addresses a ON c.id = a.customerId`;
        let countParams = [];

        if (conditions.length) {
          countQuery += ` WHERE ${conditions.join(" AND ")}`;
          countParams = params.slice(0, -2); // Remove limit and offset
        }

        db.get(countQuery, countParams, (err, countResult) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            customers: customersWithAddresses,
            totalPages: Math.ceil(countResult.total / limit),
            currentPage: parseInt(page),
            totalCount: countResult.total,
          });
        });
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });
});

// GET customer by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM customers WHERE id = ?`, [id], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get addresses for this customer
    db.all(
      `SELECT * FROM addresses WHERE customerId = ?`,
      [id],
      (err, addresses) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({ ...customer, addresses });
      }
    );
  });
});

// POST create new customer
router.post("/", (req, res) => {
  const { firstName, lastName, email, phone, address } = req.body;

  // Validation
  if (!firstName || !lastName || !phone) {
    return res
      .status(400)
      .json({ message: "First name, last name, and phone are required" });
  }

  // Check if phone already exists
  db.get(`SELECT id FROM customers WHERE phone = ?`, [phone], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    // Insert customer
    db.run(
      `INSERT INTO customers (firstName, lastName, email, phone) VALUES (?, ?, ?, ?)`,
      [firstName, lastName, email, phone],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const customerId = this.lastID;

        // If address is provided, add it
        if (address) {
          const { addressLine1, addressLine2, city, state, pinCode } = address;

          db.run(
            `INSERT INTO addresses (customerId, addressLine1, addressLine2, city, state, pinCode, isPrimary) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              customerId,
              addressLine1,
              addressLine2 || "",
              city,
              state,
              pinCode,
              1,
            ],
            function (err) {
              if (err) {
                // Still return success but log the address error
                console.error("Error adding address:", err);
              }

              // Get the complete customer with address
              db.get(
                `SELECT * FROM customers WHERE id = ?`,
                [customerId],
                (err, customer) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  db.all(
                    `SELECT * FROM addresses WHERE customerId = ?`,
                    [customerId],
                    (err, addresses) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      res.status(201).json({
                        message: "Customer created successfully",
                        customer: { ...customer, addresses },
                      });
                    }
                  );
                }
              );
            }
          );
        } else {
          // No address provided, just return customer
          db.get(
            `SELECT * FROM customers WHERE id = ?`,
            [customerId],
            (err, customer) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.status(201).json({
                message: "Customer created successfully",
                customer: { ...customer, addresses: [] },
              });
            }
          );
        }
      }
    );
  });
});

// PUT update customer
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone } = req.body;

  // Validation
  if (!firstName || !lastName || !phone) {
    return res
      .status(400)
      .json({ message: "First name, last name, and phone are required" });
  }

  // Check if phone already exists for another customer
  db.get(
    `SELECT id FROM customers WHERE phone = ? AND id != ?`,
    [phone, id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (row) {
        return res.status(400).json({
          message: "Phone number already exists for another customer",
        });
      }

      // Update customer
      db.run(
        `UPDATE customers SET firstName = ?, lastName = ?, email = ?, phone = ? WHERE id = ?`,
        [firstName, lastName, email, phone, id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ message: "Customer not found" });
          }

          res.json({ message: "Customer updated successfully" });
        }
      );
    }
  );
});

// backend/routes/customers.js - DELETE endpoint
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // First check if customer exists
  db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if customer has addresses
    db.get(
      "SELECT COUNT(*) as addressCount FROM addresses WHERE customerId = ?",
      [id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Delete the customer (addresses will be deleted automatically due to CASCADE)
        db.run("DELETE FROM customers WHERE id = ?", [id], function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            message: "Customer deleted successfully",
            deletedAddresses: result.addressCount,
          });
        });
      }
    );
  });
});

// backend/routes/customers.js - Fix the cities field population
router.get("/", (req, res) => {
  const { page = 1, limit = 10, search, city, state, pinCode } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT c.*, 
           COUNT(a.id) as addressCount,
           GROUP_CONCAT(DISTINCT a.city || ', ' || a.state || ' ' || a.pinCode) as locations
    FROM customers c
    LEFT JOIN addresses a ON c.id = a.customerId
  `;

  let conditions = [];
  let params = [];

  if (search) {
    conditions.push(
      `(c.firstName LIKE ? OR c.lastName LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (city) {
    conditions.push(`a.city LIKE ?`);
    params.push(`%${city}%`);
  }

  if (state) {
    conditions.push(`a.state LIKE ?`);
    params.push(`%${state}%`);
  }

  if (pinCode) {
    conditions.push(`a.pinCode LIKE ?`);
    params.push(`%${pinCode}%`);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` GROUP BY c.id ORDER BY c.id LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get addresses for each customer to include in response
    const customersWithAddresses = Promise.all(
      rows.map((customer) => {
        return new Promise((resolve, reject) => {
          db.all(
            `SELECT * FROM addresses WHERE customerId = ?`,
            [customer.id],
            (err, addresses) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  ...customer,
                  addresses: addresses || [],
                  cities: customer.locations || "", // Ensure cities field is always present
                });
              }
            }
          );
        });
      })
    );

    customersWithAddresses
      .then((customers) => {
        // Get total count for pagination
        let countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM customers c LEFT JOIN addresses a ON c.id = a.customerId`;
        let countParams = [];

        if (conditions.length) {
          countQuery += ` WHERE ${conditions.join(" AND ")}`;
          countParams = params.slice(0, -2); // Remove limit and offset
        }

        db.get(countQuery, countParams, (err, countResult) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            customers: customers,
            totalPages: Math.ceil(countResult.total / limit),
            currentPage: parseInt(page),
            totalCount: countResult.total,
          });
        });
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });
});

//
// backend/routes/customers.js - Simpler approach with separate endpoint for filtered customers
router.get("/filtered", (req, res) => {
  const { city, state, pinCode } = req.query;

  let query = `
    SELECT DISTINCT c.* 
    FROM customers c
    JOIN addresses a ON c.id = a.customerId
    WHERE 1=1
  `;

  let params = [];

  if (city) {
    query += ` AND a.city LIKE ?`;
    params.push(`%${city}%`);
  }

  if (state) {
    query += ` AND a.state LIKE ?`;
    params.push(`%${state}%`);
  }

  if (pinCode) {
    query += ` AND a.pinCode LIKE ?`;
    params.push(`%${pinCode}%`);
  }

  query += ` ORDER BY c.id`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get addresses for each customer
    const customersWithAddresses = Promise.all(
      rows.map(async (customer) => {
        return new Promise((resolve, reject) => {
          db.all(
            `SELECT * FROM addresses WHERE customerId = ?`,
            [customer.id],
            (err, addresses) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  ...customer,
                  addresses: addresses || [],
                  addressCount: addresses ? addresses.length : 0,
                });
              }
            }
          );
        });
      })
    );

    customersWithAddresses
      .then((customers) => {
        res.json(customers);
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });
});

//
// backend/routes/customers.js - Add dedicated location filter endpoint
router.get("/filter-by-location", (req, res) => {
  const { city, state, pinCode } = req.query;

  let query = `
  SELECT DISTINCT c.*, 
           COUNT(a.id) as addressCount,
           GROUP_CONCAT(DISTINCT a.city || ', ' || a.state || ' ' || a.pinCode) as cities
    FROM customers c
    JOIN addresses a ON c.id = a.customerId
    WHERE 1=1  
  `;

  let params = [];

  if (city) {
    query += ` AND a.city LIKE ?`;
    params.push(`%${city}%`);
  }

  if (state) {
    query += ` AND a.state LIKE ?`;
    params.push(`%${state}%`);
  }

  if (pinCode) {
    query += ` AND a.pinCode LIKE ?`;
    params.push(`%${pinCode}%`);
  }

  query += ` GROUP BY c.id ORDER BY c.id`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

module.exports = router;
