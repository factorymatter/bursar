require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import database config (will throw if connection fails)
const db = require('./src/config/database');

// Test DB connection on startup
db.query('SELECT 1')
  .then(() => console.log('✓ Database connected'))
  .catch(err => {
    console.error('✗ Database connection failed:', err);
    process.exit(1);
  });

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
const routesToMount = [
  { file: './src/routes/institutionRoutes', path: '/api/v1/institutions' },
  { file: './src/routes/studentRoutes', path: '/api/v1/students' },
  { file: './src/routes/enrollmentRoutes', path: '/api/v1/enrollments' },
  { file: './src/routes/financialAidRoutes', path: '/api/v1/financial-aid' },
  { file: './src/routes/ruleRoutes', path: '/api/v1/rules' },
  { file: './src/routes/warningRoutes', path: '/api/v1/warnings' },
  { file: './src/routes/sisIntegrationRoutes', path: '/api/v1/sis-integration' },
  { file: './src/routes/analyticsRoutes', path: '/api/v1/analytics' },
  { file: './src/routes/chapter31Routes', path: '/api/v1/chapter31' },
  { file: './src/routes/enrollmentChangeRequestRoutes', path: '/api/v1/enrollment-change-requests' },
  { file: './src/routes/sapAppealRoutes', path: '/api/v1/sap-appeals' },
  { file: './src/routes/advisorRoutes', path: '/api/v1/advisors' },
];

routesToMount.forEach(route => {
  try {
    const router = require(route.file);
    app.use(route.path, router);
    console.log(`✓ Mounted ${route.file} at ${route.path}`);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn(`⚠ Route file not found: ${route.file} (skipping)`);
    } else {
      console.error(`✗ Failed to mount ${route.file}:`, err);
    }
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Bursar API server listening on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
