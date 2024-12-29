const express = require("express");
const pool = require("./index");
const router = express.Router();
const { authenticateToken } = require("./auth");
const multer = require("multer");
const path = require("path");

// Middleware to deactivate expired events
const deactivateExpiredEvents = async () => {
    try {
        const query = `
            UPDATE event
            SET active = false
            WHERE end_date < NOW() AND active = true
        `;
        await pool.query(query);
        console.log("Expired events marked as inactive.");
    } catch (error) {
        console.error("Error updating expired events:", error);
    }
};

// Set up storage and file naming for uploaded images
const storage = multer.diskStorage({
    destination: "./uploads/events", // Save images in the uploads/events directory
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to avoid name conflicts
    },
});

// Initialize multer for handling image uploads
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, and GIF images are allowed!"));
        }
    },
});


// Fetch all events for the logged-in planner
router.get("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const planner_id = req.user.planner_id;

    try {
        const result = await pool.query(
            `SELECT event_id, event_name, location, start_date, end_date, description, active,
                COALESCE(image_url, '/uploads/events/default-placeholder.png') AS image_url
             FROM event WHERE event_id = $1 AND planer_id = $2`,
            [id, planner_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Event not found or unauthorized" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching event details:", err);
        res.status(500).json({ error: "Failed to fetch event details" });
    }
});


// Fetch analytics for the logged-in planner
router.get("/analytics", authenticateToken, async (req, res) => {
    try {
        const planner_id = req.user.planner_id;
        if (!planner_id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE active = true) AS active_events,
                COUNT(*) FILTER (WHERE active = false) AS inactive_events,
                COUNT(*) AS total_events
            FROM event
            WHERE planer_id = $1
        `;
        const result = await pool.query(query, [planner_id]);

        res.json(result.rows[0] || { active_events: 0, inactive_events: 0, total_events: 0 });
    } catch (error) {
        console.error("Error retrieving analytics:", error);
        res.status(500).json({ error: "Failed to retrieve analytics" });
    }
});

// Add a new event with image upload
router.post("/", authenticateToken, upload.single("eventImage"), async (req, res) => {
    try {
        const {
            eventName,
            eventCategory,
            location,
            startDate,
            endDate,
            description,
            tickets,
            loyaltyPoints,
        } = req.body;
        const planner_id = req.user.planner_id;

        if (!planner_id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Handle the event image URL
        const imageUrl = req.file
            ? `${req.protocol}://${req.get("host")}/uploads/events/${req.file.filename}`
            : null;

        // Check if the category exists, insert if not
        let category = await pool.query(
            "SELECT evcatg_id FROM evcategory WHERE LOWER(description) = LOWER($1)",
            [eventCategory]
        );

        if (category.rows.length === 0) {
            category = await pool.query(
                "INSERT INTO evcategory (description) VALUES ($1) RETURNING evcatg_id",
                [eventCategory]
            );
        }

        const evcatg_id = category.rows[0].evcatg_id;

        // Insert the event
        const result = await pool.query(
            `INSERT INTO event (event_name, evcatg_id, location, start_date, end_date, description, planer_id, general_seats_total, vip_seats_total, backstage_seats_total, active, loyalty_pts, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12) RETURNING event_id`,
            [
                eventName,
                evcatg_id,
                location,
                startDate,
                endDate,
                description,
                planner_id,
                tickets.general,
                tickets.vip,
                tickets.backstage,
                loyaltyPoints,
                imageUrl,
            ]
        );

        res.status(201).json({
            message: "Event created successfully",
            eventId: result.rows[0].event_id,
            imageUrl,
        });
    } catch (err) {
        console.error("Error during event creation:", err.message);
        res.status(500).json({ error: "Failed to create event" });
    }
});

// Update an event
router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const planner_id = req.user.planner_id;
    const { eventName, eventCategory, location, startDate, endDate, description, loyaltyPoints } = req.body;

    try {
        const existingEvent = await pool.query(
            "SELECT * FROM event WHERE event_id = $1 AND planer_id = $2",
            [id, planner_id]
        );

        if (existingEvent.rows.length === 0) {
            return res.status(404).json({ error: "Event not found or unauthorized" });
        }

        let category = await pool.query(
            "SELECT evcatg_id FROM evcategory WHERE LOWER(description) = LOWER($1)",
            [eventCategory]
        );

        if (category.rows.length === 0) {
            category = await pool.query(
                "INSERT INTO evcategory (description) VALUES ($1) RETURNING evcatg_id",
                [eventCategory]
            );
        }

        const evcatg_id = category.rows[0].evcatg_id;

        const updateResult = await pool.query(
            `UPDATE event 
             SET event_name = $1, evcatg_id = $2, location = $3, start_date = $4, end_date = $5, description = $6, loyalty_pts = $7
             WHERE event_id = $8 AND planer_id = $9`,
            [eventName, evcatg_id, location, startDate, endDate, description, loyaltyPoints, id, planner_id]
        );

        if (updateResult.rowCount === 0) {
            return res.status(400).json({ error: "Failed to update event" });
        }

        res.json({ message: "Event updated successfully" });
    } catch (err) {
        console.error("Error updating event:", err);
        res.status(500).json({ error: "Internal Server Error while updating event" });
    }
});

// Toggle event active status
router.patch("/:id/status", authenticateToken, async (req, res) => {
    const { id } = req.params; // Event ID from the URL
    const { active } = req.body; // Active status from the request body
    const planner_id = req.user.planner_id; // Planner ID from the token

    try {
        // Validate that the event exists for the given planner
        const existingEvent = await pool.query(
            "SELECT * FROM event WHERE event_id = $1 AND planer_id = $2",
            [id, planner_id]
        );

        if (existingEvent.rows.length === 0) {
            return res.status(404).json({ error: "Event not found or unauthorized" });
        }

        // Update the active status of the event
        const statusUpdateResult = await pool.query(
            "UPDATE event SET active = $1 WHERE event_id = $2 AND planer_id = $3",
            [active, id, planner_id]
        );

        if (statusUpdateResult.rowCount === 0) {
            return res.status(400).json({ error: "Failed to update event status" });
        }

        res.json({
            message: `Event has been successfully ${active ? "activated" : "deactivated"}.`,
        });
    } catch (err) {
        console.error("Error toggling event status:", err);
        res.status(500).json({ error: "Internal Server Error while toggling event status" });
    }
});

// Fetch a specific event by ID
router.get("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const planner_id = req.user.planner_id;

    try {
        const result = await pool.query(
            "SELECT * FROM event WHERE event_id = $1 AND planer_id = $2",
            [id, planner_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Event not found or unauthorized" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching event details:", err);
        res.status(500).json({ error: "Failed to fetch event details" });
    }
});

// Serve static files for uploaded images
router.use("/uploads/events", express.static(path.join(__dirname, "uploads/events")));

module.exports = router;
