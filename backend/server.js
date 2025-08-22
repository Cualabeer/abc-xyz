require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Middleware to require login
function requireLogin(req,res,next){
  if(!req.session.user) return res.status(401).json({error:"Unauthorized"});
  next();
}

// Middleware to require role
function requireRole(role){
  return (req,res,next)=>{
    if(!req.session.user || !req.session.user.role.includes(role)) return res.status(403).json({error:"Forbidden"});
    next();
  };
}

// --- AUTH ---
app.post("/api/register", async (req,res)=>{
  try {
    const {name,email,password,role,garage_id} = req.body;
    if(!name || !email || !password || !role) return res.status(400).json({error:"Missing fields"});
    const hash = await bcrypt.hash(password,10);
    const result = await pool.query(
      `INSERT INTO users(name,email,password_hash,role,garage_id) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role,garage_id`,
      [name,email,hash,role,garage_id || null]
    );
    res.json(result.rows[0]);
  } catch(err){
    console.error(err);
    res.status(500).json({error:"Failed to register"});
  }
});

app.post("/api/login", async (req,res)=>{
  try{
    const {email,password} = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email=$1",[email]);
    if(result.rows.length===0) return res.status(400).json({error:"Invalid email or password"});
    const user = result.rows[0];
    const match = await bcrypt.compare(password,user.password_hash);
    if(!match) return res.status(400).json({error:"Invalid email or password"});
    req.session.user = {id:user.id,name:user.name,email:user.email,role:user.role,garage_id:user.garage_id};
    res.json(req.session.user);
  } catch(err){ console.error(err); res.status(500).json({error:"Login failed"}); }
});

app.get("/api/me", (req,res)=>{ res.json(req.session.user||null); });

// --- ADMIN / SUPERADMIN ---
app.get("/api/admin/garages", requireLogin, async (req,res)=>{
  const result = await pool.query("SELECT * FROM garages ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/api/admin/garages", requireLogin, async (req,res)=>{
  const user = req.session.user;
  if(!["admin","superadmin"].includes(user.role)) return res.status(403).json({error:"Forbidden"});
  const {name,address} = req.body;
  const result = await pool.query("INSERT INTO garages(name,address) VALUES($1,$2) RETURNING *",[name,address]);
  res.json(result.rows[0]);
});

app.get("/api/admin/bookings", requireLogin, async (req,res)=>{
  const user = req.session.user;
  if(!["admin","superadmin"].includes(user.role)) return res.status(403).json({error:"Forbidden"});
  const result = await pool.query(`SELECT b.*, u.name,u.email,u.role FROM bookings b JOIN users u ON b.user_id=u.id ORDER BY b.date,b.time`);
  res.json(result.rows);
});

app.post("/api/admin/reset-db", requireLogin, requireRole("superadmin"), async (req,res)=>{
  await pool.query("TRUNCATE bookings,users,garages RESTART IDENTITY CASCADE");
  res.json({message:"Database reset"});
});

app.post("/api/admin/reset-users", requireLogin, requireRole("superadmin"), async (req,res)=>{
  await pool.query("DELETE FROM users WHERE role != 'superadmin'");
  res.json({message:"Users reset"});
});

app.post("/api/admin/add-test-data", requireLogin, requireRole("superadmin"), async (req,res)=>{
  await pool.query("INSERT INTO garages(name,address) VALUES($1,$2)",["Test Garage","123 Street"]);
  const hash = await bcrypt.hash("password",10);
  await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)",["Test Admin","admin@test.com",hash,"admin"]);
  await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)",["Test Customer","customer@test.com",hash,"customer"]);
  res.json({message:"Test data added"});
});

app.post("/api/admin/create-user", requireLogin, requireRole("superadmin"), async (req,res)=>{
  const {name,email,password,role,garage_id} = req.body;
  const hash = await bcrypt.hash(password,10);
  const result = await pool.query("INSERT INTO users(name,email,password_hash,role,garage_id) VALUES($1,$2,$3,$4,$5) RETURNING *",[name,email,hash,role,garage_id||null]);
  res.json(result.rows[0]);
});

// --- GARAGE ---
app.get("/api/garage/bookings", requireLogin, async (req,res)=>{
  const user = req.session.user;
  if(!["garage","garage_staff"].includes(user.role)) return res.status(403).json({error:"Forbidden"});
  const garage_id = user.garage_id || req.query.garage_id;
  const result = await pool.query("SELECT b.*, u.name,u.phone,u.email FROM bookings b JOIN users u ON b.user_id=u.id WHERE b.garage_id=$1 ORDER BY b.date,b.time",[garage_id]);
  res.json(result.rows);
});

// --- CUSTOMER ---
app.post("/api/customer/book", requireLogin, async (req,res)=>{
  const user = req.session.user;
  if(user.role!=="customer") return res.status(403).json({error:"Forbidden"});
  const {garage_id,date,time,service,notes} = req.body;
  await pool.query("INSERT INTO bookings(user_id,garage_id,date,time,service,notes) VALUES($1,$2,$3,$4,$5,$6)",[user.id,garage_id,date,time,service,notes]);
  res.json({message:"Booking created"});
});

app.listen(port, ()=>console.log(`Server running on port ${port}`));