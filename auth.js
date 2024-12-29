const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const pool = require("./index");

// Secret key for JWT
const JWT_SECRET = "your-secret-key"; // Replace with an environment variable in production

// Middleware to authenticate and attach user info
function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from the Authorization header

    if (!token) {
        return res.status(401).json({ error: "Access Denied" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Token verification failed:", err.message);
            return res.status(403).json({ error: "Invalid Token" });
        }

        req.user = user;
        next();
    });
}

// Login route
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT * 
             FROM userlogin 
             INNER JOIN event_planer 
             ON userlogin.username = event_planer.username 
             WHERE userlogin.username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { username: user.username, planner_id: user.planer_id },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ token, username: user.username });
    } catch (err) {
        console.error("Error during login:", err.message);
        res.status(500).json({ error: "Login failed" });
    }
});

// Update password route
router.put("/update-password", authenticateToken, async (req, res) => {
    const { username } = req.user; // Extract username from the authenticated token
    const { oldPassword, newPassword } = req.body;

    try {
        const result = await pool.query("SELECT * FROM userlogin WHERE username = $1", [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = result.rows[0];

        // Validate the old password
        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid current password" });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        await pool.query("UPDATE userlogin SET password = $1 WHERE username = $2", [hashedNewPassword, username]);

        res.json({ message: "Password updated successfully!" });
    } catch (err) {
        console.error("Error updating password:", err.message);
        res.status(500).json({ error: "Failed to update password" });
    }
});

module.exports = { router, authenticateToken };
