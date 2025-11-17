const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

// Import PostgreSQL database connection
const { getDatabaseInfo } = require('./db/connection');

// Import routes
const authRoutes = require('./routes/auth');
const { publicRouter } = require('./routes/public');
const { secureRouter } = require('./routes/secure');
const completeRoutes = require('./routes/complete');
const studentsRoutes = require('./routes/students');
const assignmentsRoutes = require('./routes/assignments');
const schoolsRoutes = require('./routes/schools');
const subscriptionRoutes = require('./routes/subscription');
const examsRoutes = require('./routes/exams');
const coursesRoutes = require('./routes/courses');
const teacherRoutes = require('./routes/teacher');
const timetableRoutes = require('./routes/timetable');
const messagesRoutes = require('./routes/messages');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { tenantContext } = require('./middleware/tenant');

const app = express();

// Middleware
const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  // Use the production URL from env, or fall back to localhost for development
  origin: isProduction ? process.env.CORS_ORIGIN : 'http://localhost:5173',
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbInfo = await getDatabaseInfo();
    res.json({
      status: 'healthy',
      database: dbInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', tenantContext, publicRouter);
app.use('/api/students', authenticateToken, tenantContext, studentsRoutes);
app.use('/api/assignments', authenticateToken, tenantContext, assignmentsRoutes);
app.use('/api', authenticateToken, tenantContext, schoolsRoutes);
app.use('/api', authenticateToken, tenantContext, subscriptionRoutes);
app.use('/api', authenticateToken, tenantContext, examsRoutes);
app.use('/api', authenticateToken, tenantContext, coursesRoutes);
app.use('/api/teacher', authenticateToken, tenantContext, teacherRoutes);
app.use('/api/timetable', authenticateToken, tenantContext, timetableRoutes);
app.use('/api/messages', authenticateToken, tenantContext, messagesRoutes);
app.use('/api', authenticateToken, tenantContext, secureRouter);
app.use('/api', authenticateToken, tenantContext, completeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({ 
    success: false,
    error: status === 500 ? 'Internal server error' : err.message || 'Internal server error' 
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Start server with database info
app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 EduKE Server Started');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    const dbInfo = await getDatabaseInfo();
    console.log(`💾 Database: ${dbInfo.config}`);
    console.log(`📊 Tables: ${dbInfo.tableCount} tables`);
    if (dbInfo.database) {
      console.log(`🗄️  Database Name: ${dbInfo.database}`);
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
  
  console.log('='.repeat(60));
  console.log('✅ Ready to accept requests!\n');
});

module.exports = { app };
