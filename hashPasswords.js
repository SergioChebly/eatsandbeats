const bcrypt = require("bcrypt");
const pool = require("./index");

async function hashPasswords() {
    try {
        const users = await pool.query("SELECT username, password FROM userlogin");
        for (const user of users.rows) {
            if (!user.password.startsWith("$2b$")) { // Check if password is already hashed
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.query("UPDATE userlogin SET password = $1 WHERE username = $2", [hashedPassword, user.username]);
                console.log(`Password hashed for user: ${user.username}`);
            }
        }
    } catch (err) {
        console.error("Error hashing passwords:", err);
    }
}

hashPasswords();
