const express = require("express");
const pool = require("./index");
const router = express.Router();

// Get all categories
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM evcategory");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

// Add a new category
router.post("/", async (req, res) => {
    const { description } = req.body;

    try {
        const result = await pool.query(
            "INSERT INTO evcategory (description) VALUES ($1) RETURNING *",
            [description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to add category" });
    }
});

// Fetch all categories
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM evcategory');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Fetch events by category
router.get('/events/category/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM event WHERE evcatg_id = $1 AND active = TRUE`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching events by category:', err);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

module.exports = router;
