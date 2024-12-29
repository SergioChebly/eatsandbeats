const express = require("express");
const pool = require("./index"); // Database connection pool
const router = express.Router();

/**
 * Event Planner Registration Route
 * Allows a user to apply as an event planner.
 */
router.post("/register", async (req, res) => {
  const { fullName, plannerName, email, password, reason } = req.body;

  // Validate input fields
  if (!fullName || !plannerName || !email || !password || !reason) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Insert the new event planner into the database
    const result = await pool.query(
      `INSERT INTO event_planer (first_name, last_name, username, email, status, reason)
       VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING planer_id`,
      [
        fullName.split(" ")[0], // First name
        fullName.split(" ").slice(1).join(" ") || " ", // Last name
        plannerName,
        email,
        reason,
      ]
    );

    res.status(201).json({
      message: "Your application has been submitted and is pending approval.",
      plannerId: result.rows[0].planer_id,
    });
  } catch (error) {
    console.error("Error registering event planner:", error);
    res.status(500).json({ error: "Failed to submit your application. Please try again later." });
  }
});

/**
 * Get All Event Planner Applications (For Admin)
 * Fetch all applications with a specific status (pending, approved, rejected).
 */
router.get("/applications", async (req, res) => {
  const { status } = req.query;

  // Validate status query parameter
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Use 'pending', 'approved', or 'rejected'." });
  }

  try {
    const result = await pool.query(
      `SELECT planer_id, first_name, last_name, username, email, status, reason
       FROM event_planer
       WHERE status = $1`,
      [status]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ error: "Failed to fetch applications." });
  }
});

/**
 * Approve Event Planner Application (For Admin)
 */
router.put("/approve/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE event_planer SET status = 'approved' WHERE planer_id = $1 AND status = 'pending'`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Application not found or already processed." });
    }

    res.json({ message: "Event planner application approved successfully." });
  } catch (error) {
    console.error("Error approving application:", error);
    res.status(500).json({ error: "Failed to approve application." });
  }
});

/**
 * Reject Event Planner Application (For Admin)
 */
router.put("/reject/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE event_planer SET status = 'rejected' WHERE planer_id = $1 AND status = 'pending'`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Application not found or already processed." });
    }

    res.json({ message: "Event planner application rejected successfully." });
  } catch (error) {
    console.error("Error rejecting application:", error);
    res.status(500).json({ error: "Failed to reject application." });
  }
});

/**
 * Fetch Single Application Details (For Admin)
 */
router.get("/applications/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT planer_id, first_name, last_name, username, email, status, reason
       FROM event_planer
       WHERE planer_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching application details:", error);
    res.status(500).json({ error: "Failed to fetch application details." });
  }
});

module.exports = router;
