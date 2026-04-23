const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('./database/db'); // Initialize DB

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'villains-dashboard-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set to true if using https
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/barang', require('./routes/barang'));
app.use('/api/masuk', require('./routes/masuk'));
app.use('/api/penjualan', require('./routes/penjualan'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Serve index.html for all other routes (SPA style)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    // API 404
    return res.status(404).json({ success: false, message: 'API Endpoint not found' });
  }
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

// Error handler (Catch all server errors and return JSON)
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal Server Error',
    error: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Dashboard Produk running at http://localhost:${PORT}`);
});
