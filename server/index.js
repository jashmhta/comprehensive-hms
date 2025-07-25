const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const { createServer } = require('http');
const { Server } = require('socket.io');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import configurations and middleware
const { sequelize, connectMongoDB, redisClient } = require('./config/database');
const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { authenticateToken } = require('./middleware/authMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const opdRoutes = require('./routes/opdRoutes');
const ipdRoutes = require('./routes/ipdRoutes');
const otRoutes = require('./routes/otRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const labRoutes = require('./routes/labRoutes');
const radiologyRoutes = require('./routes/radiologyRoutes');
const bloodBankRoutes = require('./routes/bloodBankRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const billingRoutes = require('./routes/billingRoutes');
const hrRoutes = require('./routes/hrRoutes');
const housekeepingRoutes = require('./routes/housekeepingRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const dietaryRoutes = require('./routes/dietaryRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const complianceRoutes = require('./routes/complianceRoutes');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital Management System API',
      version: '1.0.0',
      description: 'Comprehensive HMS API for multi-specialty hospitals',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './models/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(limiter);

// Session configuration
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'hms-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Socket.io for real-time features
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('join_room', (room) => {
    socket.join(room);
    logger.info(`User ${socket.id} joined room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', authenticateToken, patientRoutes);
app.use('/api/opd', authenticateToken, opdRoutes);
app.use('/api/ipd', authenticateToken, ipdRoutes);
app.use('/api/ot', authenticateToken, otRoutes);
app.use('/api/emergency', authenticateToken, emergencyRoutes);
app.use('/api/pharmacy', authenticateToken, pharmacyRoutes);
app.use('/api/lab', authenticateToken, labRoutes);
app.use('/api/radiology', authenticateToken, radiologyRoutes);
app.use('/api/blood-bank', authenticateToken, bloodBankRoutes);
app.use('/api/insurance', authenticateToken, insuranceRoutes);
app.use('/api/billing', authenticateToken, billingRoutes);
app.use('/api/hr', authenticateToken, hrRoutes);
app.use('/api/housekeeping', authenticateToken, housekeepingRoutes);
app.use('/api/equipment', authenticateToken, equipmentRoutes);
app.use('/api/dietary', authenticateToken, dietaryRoutes);
app.use('/api/ambulance', authenticateToken, ambulanceRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/compliance', authenticateToken, complianceRoutes);

// Static files
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Database connections and server startup
async function startServer() {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized');
    
    // Connect to MongoDB
    await connectMongoDB();
    logger.info('MongoDB connected successfully');
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`HMS Server running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

startServer();

module.exports = app;