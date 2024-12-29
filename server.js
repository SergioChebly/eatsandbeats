const express = require("express");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan"); // For logging HTTP requests
const cron = require("node-cron");
const pool = require("./index"); // Ensure correct import for database pool
const eventRoutes = require("./events");
const { router: authRoutes } = require("./auth");
const analyticsRoutes = require("./analytics");
const app = express();
const eventPlannerRoutes = require("./eventPlaner");



// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan("dev")); // Logs HTTP requests
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the "public" directory

// Routes
app.use("/api/events", eventRoutes);
app.use("/api", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/event-planner", eventPlannerRoutes);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Server is running", uptime: process.uptime() });
});

// Cron Job to Deactivate Expired Events
cron.schedule("0 0 * * *", async () => {
  try {
    const query = `
      UPDATE event
      SET active = false
      WHERE end_date < NOW() AND active = true
    `;
    await pool.query(query);
    console.log("Expired events marked as inactive.");
  } catch (error) {
    console.error("Error updating event statuses:", error);
  }
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
