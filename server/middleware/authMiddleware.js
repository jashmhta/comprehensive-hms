const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { User, Staff } = require('../models');
const { logSecurityEvent } = require('../config/logger');
const { redisClient } = require('../config/database');

// JWT Token Generation
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'hms-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// JWT Token Verification
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hms-jwt-secret');
    
    // Get user details
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Staff,
        as: 'staff'
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date() < user.locked_until) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      logSecurityEvent('unauthorized_access_attempt', req.user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requiredRoles: roles,
        userRole: req.user.role,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Password hashing
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Password verification
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Two-Factor Authentication
const generateTwoFactorSecret = () => {
  return speakeasy.generateSecret({
    name: 'Hospital Management System',
    length: 32
  });
};

const verifyTwoFactorToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps (60 seconds) tolerance
  });
};

// Account lockout mechanism
const handleFailedLogin = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) return;

  const failedAttempts = (user.failed_login_attempts || 0) + 1;
  const maxAttempts = 5;
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes

  if (failedAttempts >= maxAttempts) {
    await user.update({
      failed_login_attempts: failedAttempts,
      locked_until: new Date(Date.now() + lockoutDuration)
    });

    logSecurityEvent('account_locked', userId, {
      reason: 'too_many_failed_attempts',
      attempts: failedAttempts
    });
  } else {
    await user.update({
      failed_login_attempts: failedAttempts
    });
  }
};

// Reset failed login attempts on successful login
const resetFailedAttempts = async (userId) => {
  await User.update(
    {
      failed_login_attempts: 0,
      locked_until: null,
      last_login: new Date()
    },
    { where: { id: userId } }
  );
};

// Session management
const createSession = async (userId, token, req) => {
  const sessionData = {
    userId,
    token,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    createdAt: new Date().toISOString()
  };

  // Store session in Redis with expiration
  await redisClient.setex(
    `session:${userId}:${token}`,
    24 * 60 * 60, // 24 hours
    JSON.stringify(sessionData)
  );
};

// Logout and token blacklisting
const logout = async (req, res) => {
  try {
    const token = req.token;
    const userId = req.user.id;

    // Add token to blacklist
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiresIn > 0) {
      await redisClient.setex(`blacklist:${token}`, expiresIn, 'true');
    }

    // Remove session
    await redisClient.del(`session:${userId}:${token}`);

    logSecurityEvent('user_logout', userId, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Rate limiting for authentication endpoints
const authRateLimit = async (req, res, next) => {
  const key = `auth_rate_limit:${req.ip}`;
  const maxAttempts = 10;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  try {
    const current = await redisClient.get(key);
    
    if (current && parseInt(current) >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.'
      });
    }

    await redisClient.multi()
      .incr(key)
      .expire(key, Math.floor(windowMs / 1000))
      .exec();

    next();
  } catch (error) {
    // If Redis fails, allow the request to proceed
    next();
  }
};

module.exports = {
  authenticateToken,
  authorize,
  generateToken,
  hashPassword,
  verifyPassword,
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  handleFailedLogin,
  resetFailedAttempts,
  createSession,
  logout,
  authRateLimit
};