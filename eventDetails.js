const express = require('express');
const router = express.Router();
const pool = require('./index');

// Fetch event details
router.get('/events/:eventId', async (req, res) => {
    const { eventId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM event WHERE event_id = $1', [eventId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching event details:', err);
        res.status(500).json({ error: 'Failed to fetch event details' });
    }
});

// Reserve tickets and initiate payment
router.post('/reserve', async (req, res) => {
    const { userId, eventId, ticketType, quantity } = req.body;
    try {
        const reservationId = Math.floor(100000 + Math.random() * 900000); // Random ID
        await pool.query(
            `INSERT INTO purchase (user_id, event_id, nbroftickets, paymentmethod) 
             VALUES ($1, $2, $3, 'omt') RETURNING purchase_id`,
            [userId, eventId, quantity]
        );
        res.json({
            message: 'Reservation successful. Proceed to payment.',
            paymentInstructions: `Send payment to OMT number +96176547104. Reservation ID: ${reservationId}`,
        });
    } catch (err) {
        console.error('Error during reservation:', err);
        res.status(500).json({ error: 'Reservation failed' });
    }
});

module.exports = router;
