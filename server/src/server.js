const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { connectDB } = require('./utils/db');

// ✅ Load .env from the server folder
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ CORS: allow dev client origin
const allowedOrigins = (
  process.env.CLIENT_ORIGIN ||
  'http://localhost:5173,http://127.0.0.1:5173'
).split(',').map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman/curl
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/pizzas', require('./routes/pizzas'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customize', require('./routes/customize'));
app.use('/api/payments', require('./routes/payments'));

// Global error handler
app.use((err, req, res, next) => {
  const isValidation = err.name === 'ValidationError';
  const code = isValidation ? 400 : err.statusCode || 500;
  if (code >= 500) console.error('Error:', err);
  res.status(code).json({
    message: err.message || (isValidation ? 'Validation error' : 'Server error'),
  });
});

const PORT = process.env.PORT || 5000;

// ✅ Start DB + server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Failed to connect DB:', e);
    process.exit(1);
  });
