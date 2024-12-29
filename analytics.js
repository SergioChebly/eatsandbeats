const express = require("express");
const pool = require("./index");
const router = express.Router();
const { authenticateToken } = require("./auth");

// Total Tickets Sold Per Event
router.get("/tickets-sold", authenticateToken, async (req, res) => {
    const plannerId = req.user.planner_id;
    try {
        const result = await pool.query(
            `SELECT e.event_name, COALESCE(SUM(p.nbroftickets), 0) AS total_tickets
             FROM event e
             JOIN ticketing t ON e.event_id = t.event_id
             JOIN purchase p ON t.purchase_id = p.purchase_id
             WHERE e.planer_id = $1
             GROUP BY e.event_name
             ORDER BY total_tickets DESC`,
            [plannerId]
        );
        console.log("Tickets sold for planner:", plannerId, result.rows); // Debugging
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching tickets sold:", error);
        res.status(500).json({ error: "Failed to fetch tickets sold." });
    }
});

// Revenue Breakdown By Event
router.get("/revenue", authenticateToken, async (req, res) => {
    const plannerId = req.user.planner_id;
    try {
        const result = await pool.query(
            `SELECT e.event_name, COALESCE(SUM(p.price * pur.nbroftickets), 0) AS revenue
             FROM event e
             JOIN ticketing t ON e.event_id = t.event_id
             JOIN purchase pur ON t.purchase_id = pur.purchase_id
             JOIN pricingevents p ON t.ticketcatg_id = p.ticketcatg_id
             WHERE e.planer_id = $1
             GROUP BY e.event_name
             ORDER BY revenue DESC`,
            [plannerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching revenue:", error);
        res.status(500).json({ error: "Failed to fetch revenue." });
    }
});

// Events By Category
router.get("/events-by-category", authenticateToken, async (req, res) => {
    const plannerId = req.user.planner_id;
    try {
        const result = await pool.query(
            `SELECT c.description AS category, COALESCE(COUNT(e.event_id), 0) AS total_events
             FROM evcategory c
             LEFT JOIN event e ON c.evcatg_id = e.evcatg_id AND e.planer_id = $1
             GROUP BY c.description
             ORDER BY total_events DESC`,
            [plannerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching events by category:", error);
        res.status(500).json({ error: "Failed to fetch events by category." });
    }
});

// Average Rating Per Event
router.get("/ratings", authenticateToken, async (req, res) => {
    const plannerId = req.user.planner_id;
    try {
        const result = await pool.query(
            `SELECT e.event_name, COALESCE(AVG(r.rating), 0) AS average_rating
             FROM event e
             LEFT JOIN reviews r ON e.event_id = r.event_id
             WHERE e.planer_id = $1
             GROUP BY e.event_name
             ORDER BY average_rating DESC`,
            [plannerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching ratings:", error);
        res.status(500).json({ error: "Failed to fetch ratings." });
    }
});

// Active vs Inactive Events
router.get("/active-inactive", authenticateToken, async (req, res) => {
    const plannerId = req.user.planner_id;
    try {
        const result = await pool.query(
            `SELECT active, COALESCE(COUNT(*), 0) AS total_events
             FROM event
             WHERE planer_id = $1
             GROUP BY active`,
            [plannerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching active/inactive events:", error);
        res.status(500).json({ error: "Failed to fetch active/inactive events." });
    }
});

// Events By Month
router.get("/events-by-month", authenticateToken, async (req, res) => {
    const plannerId = req.user.planner_id;
    try {
        const result = await pool.query(
            `SELECT EXTRACT(MONTH FROM start_date) AS month, COALESCE(COUNT(event_id), 0) AS total_events
             FROM event
             WHERE planer_id = $1
             GROUP BY month
             ORDER BY month`,
            [plannerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching events by month:", error);
        res.status(500).json({ error: "Failed to fetch events by month." });
    }
});

module.exports = router;
