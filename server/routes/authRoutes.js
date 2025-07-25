const express = require('express');
const { body, validationResult } = require('express-validator');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User, Staff } = require('../models');
const {
  generateToken,
  hashPassword,
  verifyPassword,
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  handleFailedLogin,
  resetFailedAttempts,
  createSession,
  logout,
  authRateLimit,
  authenticateToken
} = require('../middleware/authMiddleware');
const { logSecurityEvent } = require('../config/logger');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *         twoFactorToken:
 *           type: string
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *             user:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post('/login',
  authRateLimit,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('twoFactorToken').optional().isLength({ min: 6, max: 6 }).withMessage('2FA token must be 6 digits')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, twoFactorToken } = req.body;

      // Find user
      const user = await User.findOne({
        where: { email, is_active: true },
        include: [{
          model: Staff,
          as: 'staff'
        }]
      });

      if (!user) {
        logSecurityEvent('login_attempt_invalid_user', null, {
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (user.locked_until && new Date() < user.locked_until) {
        const lockTimeRemaining = Math.ceil((user.locked_until - new Date()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${lockTimeRemaining} minutes.`
        });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        await handleFailedLogin(user.id);
        logSecurityEvent('login_attempt_invalid_password', user.id, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        if (!twoFactorToken) {
          return res.status(200).json({
            success: true,
            data: {
              twoFactorRequired: true,
              message: 'Two-factor authentication required'
            }
          });
        }

        const is2FAValid = verifyTwoFactorToken(twoFactorToken, user.two_factor_secret);
        if (!is2FAValid) {
          logSecurityEvent('login_attempt_invalid_2fa', user.id, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          return res.status(401).json({
            success: false,
            message: 'Invalid two-factor authentication code'
          });
        }
      }

      // Generate JWT token
      const token = generateToken(user.id, user.role);

      // Reset failed login attempts
      await resetFailedAttempts(user.id);

      // Create session
      await createSession(user.id, token, req);

      // Log successful login
      logSecurityEvent('login_successful', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Remove sensitive data
      const userData = user.toJSON();
      delete userData.password_hash;
      delete userData.two_factor_secret;

      res.json({
        success: true,
        data: {
          token,
          user: userData
        },
        message: 'Login successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *               - staff_data
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, doctor, nurse, receptionist, lab_technician, pharmacist, radiologist, accountant, hr_manager, housekeeping, security]
 *               staff_data:
 *                 type: object
 *     responses:
 *       201:
 *         description: User registered successfully
 *       403:
 *         description: Admin access required
 */
router.post('/register',
  authenticateToken,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('role').isIn(['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'radiologist', 'accountant', 'hr_manager', 'housekeeping', 'security'])
      .withMessage('Valid role required'),
    body('staff_data.first_name').trim().isLength({ min: 2, max: 50 }).withMessage('First name required'),
    body('staff_data.last_name').trim().isLength({ min: 2, max: 50 }).withMessage('Last name required'),
    body('staff_data.employee_id').trim().isLength({ min: 3, max: 20 }).withMessage('Employee ID required')
  ],
  async (req, res) => {
    try {
      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, role, staff_data } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Check if employee ID already exists
      const existingStaff = await Staff.findOne({ where: { employee_id: staff_data.employee_id } });
      if (existingStaff) {
        return res.status(409).json({
          success: false,
          message: 'Employee ID already exists'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user and staff in transaction
      const result = await sequelize.transaction(async (t) => {
        // Create user
        const user = await User.create({
          email,
          password_hash: hashedPassword,
          role,
          username: email.split('@')[0] + '_' + Date.now()
        }, { transaction: t });

        // Create staff
        const staff = await Staff.create({
          user_id: user.id,
          ...staff_data
        }, { transaction: t });

        return { user, staff };
      });

      logSecurityEvent('user_registered', result.user.id, {
        registered_by: req.user.id,
        role,
        employee_id: staff_data.employee_id
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user_id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          staff_id: result.staff.id,
          employee_id: result.staff.employee_id
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Staff,
        as: 'staff'
      }],
      attributes: { exclude: ['password_hash', 'two_factor_secret'] }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticateToken, logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain uppercase, lowercase, number and special character')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findByPk(req.user.id);

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        logSecurityEvent('password_change_attempt_invalid_current', user.id, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await user.update({ password_hash: hashedNewPassword });

      logSecurityEvent('password_changed', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/enable-2fa:
 *   post:
 *     summary: Enable two-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup initiated
 */
router.post('/enable-2fa', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is already enabled'
      });
    }

    // Generate secret
    const secret = generateTwoFactorSecret();

    // Generate QR code
    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: user.email,
      name: 'Hospital Management System',
      issuer: 'HMS'
    });

    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl);

    // Store secret temporarily (not enabled until verified)
    await user.update({ two_factor_secret: secret.base32 });

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeImage,
        manualEntryKey: secret.base32
      },
      message: 'Scan QR code with your authenticator app and verify to enable 2FA'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/verify-2fa-setup:
 *   post:
 *     summary: Verify and complete 2FA setup
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 */
router.post('/verify-2fa-setup',
  authenticateToken,
  [
    body('token').isLength({ min: 6, max: 6 }).withMessage('6-digit token required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user.two_factor_secret) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication setup not initiated'
        });
      }

      // Verify token
      const isTokenValid = verifyTwoFactorToken(token, user.two_factor_secret);
      if (!isTokenValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      // Enable 2FA
      await user.update({ two_factor_enabled: true });

      logSecurityEvent('2fa_enabled', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify 2FA setup',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/disable-2fa:
 *   post:
 *     summary: Disable two-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 */
router.post('/disable-2fa',
  authenticateToken,
  [
    body('password').notEmpty().withMessage('Password required to disable 2FA')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { password } = req.body;
      const user = await User.findByPk(req.user.id);

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Disable 2FA
      await user.update({
        two_factor_enabled: false,
        two_factor_secret: null
      });

      logSecurityEvent('2fa_disabled', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA',
        error: error.message
      });
    }
  }
);

module.exports = router;