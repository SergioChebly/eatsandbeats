const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "eats_ands_beats",
    password: "chebly",
    port: 5432,
});

module.exports = pool;
