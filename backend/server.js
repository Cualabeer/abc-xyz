const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// ----- ENV -----
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

// ----- DB -----
const pool = new Pool({ connectionString: DATABASE_URL });

// ----- MIDDLEWARE -----
app.use(bodyParser.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// ----- SERVE FRONTEND -----
app.use(express.static(path.join(__dirname, '../frontend')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ----- LOGIN & REGISTER -----
app.post('/api/register', async (req,res)=>{
  const {name,email,password,role} = req.body;
  const hash = await bcrypt.hash(password,10);
  try {
    await pool.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)",
      [name,email,hash,role]
    );
    res.json({success:true});
  } catch(e){ res.json({error:e.message}); }
});

app.post('/api/login', async (req,res)=>{
  const {email,password} = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email=$1",[email]);
  const user = result.rows[0];
  if(!user) return res.json({error:"User not found"});
  const match = await bcrypt.compare(password,user.password_hash);
  if(!match) return res.json({error:"Incorrect password"});
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({role:user.role});
});

// ----- ADMIN/SUPERADMIN -----
app.post('/api/admin/reset-db', async (req,res)=>{
  if(req.session.role !== 'superadmin') return res.json({error:"Unauthorized"});
  await pool.query("DELETE FROM bookings; DELETE FROM users; DELETE FROM garages;");
  res.json({success:true});
});

app.post('/api/admin/reset-users', async (req,res)=>{
  if(req.session.role !== 'superadmin') return res.json({error:"Unauthorized"});
  await pool.query("DELETE FROM users");
  res.json({success:true});
});

app.post('/api/admin/add-test-data', async (req,res)=>{
  if(req.session.role !== 'superadmin') return res.json({error:"Unauthorized"});
  await pool.query("INSERT INTO garages(name,address) VALUES('Test Garage','123 Test St')");
  await pool.query("INSERT INTO users(name,email,password_hash,role,garage_id) VALUES('Admin','admin@test.com','$2b$10$zjYzRbO9JcVZsD4g/vR7BOSJx2pTqAKXk6rZDW9xh0u7IdzwnO2Qi','admin',1)");
  res.json({success:true});
});

// ----- GARAGE -----
app.get('/api/garage/bookings', async (req,res)=>{
  if(req.session.role!=='garage') return res.json({error:"Unauthorized"});
  const garageIdResult = await pool.query("SELECT garage_id FROM users WHERE id=$1",[req.session.userId]);
  const garageId = garageIdResult.rows[0].garage_id;
  const bookings = await pool.query(
    "SELECT b.*, u.name, u.email FROM bookings b JOIN users u ON u.id=b.user_id WHERE b.garage_id=$1",
    [garageId]
  );
  res.json(bookings.rows);
});

// ----- CUSTOMER -----
app.post('/api/customer/book', async (req,res)=>{
  if(req.session.role!=='customer') return res.json({error:"Unauthorized"});
  const {garage_id,date,time,service,notes} = req.body;
  await pool.query(
    "INSERT INTO bookings(user_id,garage_id,date,time,service,notes) VALUES($1,$2,$3,$4,$5,$6)",
    [req.session.userId,garage_id,date,time,service,notes]
  );
  res.json({success:true});
});

// ----- START SERVER -----
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));