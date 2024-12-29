const express = require("express");
const pool = require("./index");
const router = express.Router();

// Get ticket pricing for an event
router.get("/:eventId", async (req, res) => {
    const { eventId } = req.params;

    try {
        const result = await pool.query(
            "SELECT * FROM pricingevents WHERE event_id = $1",
            [eventId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch ticket pricing" });
    }
});

// Add ticket pricing for an event
router.post("/", async (req, res) => {
    const { ticketcatg_id, event_id, price, seat_type, total_seats } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO pricingevents (ticketcatg_id, event_id, price, seat_type, total_seats) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [ticketcatg_id, event_id, price, seat_type, total_seats]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to add ticket pricing" });
    }
});

module.exports = router;
