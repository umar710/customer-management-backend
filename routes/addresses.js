// backend/routes/addresses.js
const express = require("express");
const db = require("../models/database");
const router = express.Router();

// GET all addresses with filtering
router.get("/", (req, res) => {
  const { city, state, pinCode, customerId } = req.query;

  let query = `
    SELECT a.*, c.firstName, c.lastName 
    FROM addresses a
    JOIN customers c ON a.customerId = c.id
  `;

  let conditions = [];
  let params = [];

  if (city) {
    conditions.push(`a.city = ?`);
    params.push(city);
  }

  if (state) {
    conditions.push(`a.state = ?`);
    params.push(state);
  }

  if (pinCode) {
    conditions.push(`a.pinCode = ?`);
    params.push(pinCode);
  }

  if (customerId) {
    conditions.push(`a.customerId = ?`);
    params.push(customerId);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY a.id`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

// POST add new address
router.post("/", (req, res) => {
  const {
    customerId,
    addressLine1,
    addressLine2,
    city,
    state,
    pinCode,
    isPrimary,
  } = req.body;

  // Validation
  if (!customerId || !addressLine1 || !city || !state || !pinCode) {
    return res
      .status(400)
      .json({
        message:
          "Customer ID, address line 1, city, state, and pin code are required",
      });
  }

  // Check if customer exists
  db.get(`SELECT id FROM customers WHERE id = ?`, [customerId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // If setting as primary, remove primary status from other addresses
    if (isPrimary) {
      db.run(
        `UPDATE addresses SET isPrimary = 0 WHERE customerId = ?`,
        [customerId],
        function (err) {
          if (err) {
            console.error("Error updating primary addresses:", err);
          }

          // Insert new address
          insertAddress();
        }
      );
    } else {
      insertAddress();
    }
  });

  function insertAddress() {
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
        isPrimary ? 1 : 0,
      ],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          message: "Address added successfully",
          addressId: this.lastID,
        });
      }
    );
  }
});

// PUT update address
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { addressLine1, addressLine2, city, state, pinCode, isPrimary } =
    req.body;

  // Validation
  if (!addressLine1 || !city || !state || !pinCode) {
    return res
      .status(400)
      .json({
        message: "Address line 1, city, state, and pin code are required",
      });
  }

  // Get the customerId from the existing address
  db.get(
    `SELECT customerId FROM addresses WHERE id = ?`,
    [id],
    (err, address) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }

      // If setting as primary, remove primary status from other addresses
      if (isPrimary) {
        db.run(
          `UPDATE addresses SET isPrimary = 0 WHERE customerId = ? AND id != ?`,
          [address.customerId, id],
          function (err) {
            if (err) {
              console.error("Error updating primary addresses:", err);
            }

            // Update the address
            updateAddress();
          }
        );
      } else {
        updateAddress();
      }
    }
  );

  function updateAddress() {
    db.run(
      `UPDATE addresses SET addressLine1 = ?, addressLine2 = ?, city = ?, state = ?, pinCode = ?, isPrimary = ? 
            WHERE id = ?`,
      [
        addressLine1,
        addressLine2 || "",
        city,
        state,
        pinCode,
        isPrimary ? 1 : 0,
        id,
      ],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "Address not found" });
        }

        res.json({ message: "Address updated successfully" });
      }
    );
  }
});

// DELETE address
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM addresses WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ message: "Address deleted successfully" });
  });
});

module.exports = router;
