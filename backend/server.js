const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Root login/register page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ----------------------
// AUTH ROUTES
// ----------------------

// Register user
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, garage_id } = req.body;
  if (!name || !email || !password || !role) return res.json({ error: "Missing fields" });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users(name,email,password_hash,role,garage_id) VALUES($1,$2,$3,$4,$5)",
      [name,email,hash,role,garage_id || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ error: "Incorrect password" });

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.garageId = user.garage_id || null;

    res.json({ role: user.role });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ----------------------
// SUPERADMIN / ADMIN ROUTES
// ----------------------

app.post('/api/admin/reset-db', async (req,res)=>{
  if(req.session.role !== 'superadmin') return res.json({ error: "Unauthorized" });
  try {
    await pool.query("DELETE FROM bookings; DELETE FROM users; DELETE FROM garages;");
    res.json({ success: true });
  } catch(err){ res.json({ error: err.message }); }
});

app.post('/api/admin/reset-users', async (req,res)=>{
  if(req.session.role !== 'superadmin') return res.json({ error: "Unauthorized" });
  try {
    await pool.query("DELETE FROM users;");
    res.json({ success: true });
  } catch(err){ res.json({ error: err.message }); }
});

app.post('/api/admin/add-test-data', async (req,res)=>{
  if(req.session.role !== 'superadmin') return res.json({ error: "Unauthorized" });
  try {
    // Add sample garage
    await pool.query("INSERT INTO garages(name,address) VALUES('Test Garage','123 Test St')");
    // Add sample admin user (password: admin123)
    const hash = await bcrypt.hash('admin123',10);
    await pool.query(
      "INSERT INTO users(name,email,password_hash,role,garage_id) VALUES('Admin','admin@test.com',$1,'admin',1)",
      [hash]
    );
    res.json({ success: true });
  } catch(err){ res.json({ error: err.message }); }
});

// ----------------------
// GARAGE ROUTES
// ----------------------

app.get('/api/garage/bookings', async (req,res)=>{
  if(req.session.role!=='garage') return res.json({ error: "Unauthorized" });
  try {
    const bookings = await pool.query(
      "SELECT b.*, u.name, u.email FROM bookings b JOIN users u ON u.id=b.user_id WHERE b.garage_id=$1",
      [req.session.garageId]
    );
    res.json(bookings.rows);
  } catch(err){ res.json({ error: err.message }); }
});

// ----------------------
// CUSTOMER ROUTES
// ----------------------

app.post('/api/customer/book', async (req,res)=>{
  if(req.session.role!=='customer') return res.json({ error: "Unauthorized" });
  const { garage_id, date, time, service, notes } = req.body;
  if(!garage_id || !date || !time || !service) return res.json({ error: "Missing fields" });
  try {
    await pool.query(
      "INSERT INTO bookings(user_id,garage_id,date,time,service,notes) VALUES($1,$2,$3,$4,$5,$6)",
      [req.session.userId, garage_id, date, time, service, notes || null]
    );
    res.json({ success: true });
  } catch(err){ res.json({ error: err.message }); }
});

// ----------------------
// START SERVER
// ----------------------
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));