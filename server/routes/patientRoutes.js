const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Patient, OPDAppointment, IPDAdmission, LabOrder, RadiologyOrder } = require('../models');
const { authorize } = require('../middleware/authMiddleware');
const { logMedicalEvent } = require('../config/logger');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Patient:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - date_of_birth
 *         - gender
 *         - phone
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         patient_id:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         date_of_birth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *         blood_group:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *         address:
 *           type: string
 */

// Generate unique patient ID
const generatePatientId = async () => {
  const year = new Date().getFullYear();
  const count = await Patient.count({
    where: {
      patient_id: {
        [Op.like]: `PAT${year}%`
      }
    }
  });
  return `PAT${year}${String(count + 1).padStart(6, '0')}`;
};

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Register a new patient
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Patient'
 *     responses:
 *       201:
 *         description: Patient registered successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    body('first_name').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
    body('last_name').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
    body('date_of_birth').isISO8601().withMessage('Valid date of birth required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender required'),
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('blood_group').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood group required')
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

      // Check if patient already exists
      const existingPatient = await Patient.findOne({
        where: {
          phone: req.body.phone,
          is_active: true
        }
      });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: 'Patient with this phone number already exists',
          patient: {
            id: existingPatient.id,
            patient_id: existingPatient.patient_id,
            name: `${existingPatient.first_name} ${existingPatient.last_name}`
          }
        });
      }

      // Generate patient ID
      const patientId = await generatePatientId();

      // Create patient
      const patient = await Patient.create({
        ...req.body,
        patient_id: patientId
      });

      logMedicalEvent('patient_registered', patient.id, req.user.id, {
        patient_id: patientId,
        name: `${patient.first_name} ${patient.last_name}`
      });

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: patient
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to register patient',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients with pagination and search
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of patients per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, phone, or patient ID
 *     responses:
 *       200:
 *         description: List of patients
 */
router.get('/',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().trim().isLength({ min: 2 }).withMessage('Search term must be at least 2 characters')
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

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search;

      let whereClause = { is_active: true };

      if (search) {
        whereClause = {
          ...whereClause,
          [Op.or]: [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
            { patient_id: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const { count, rows: patients } = await Patient.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['deleted_at'] }
      });

      res.json({
        success: true,
        data: {
          patients,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(count / limit),
            total_records: count,
            per_page: limit
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch patients',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Get patient by ID with medical history
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient details
 *       404:
 *         description: Patient not found
 */
router.get('/:id',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    param('id').isUUID().withMessage('Valid patient ID required')
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

      const patient = await Patient.findOne({
        where: { id: req.params.id, is_active: true },
        include: [
          {
            model: OPDAppointment,
            as: 'opd_appointments',
            limit: 10,
            order: [['appointment_date', 'DESC']]
          },
          {
            model: IPDAdmission,
            as: 'ipd_admissions',
            limit: 5,
            order: [['admission_date', 'DESC']]
          },
          {
            model: LabOrder,
            as: 'lab_orders',
            limit: 10,
            order: [['order_date', 'DESC']]
          },
          {
            model: RadiologyOrder,
            as: 'radiology_orders',
            limit: 10,
            order: [['order_date', 'DESC']]
          }
        ]
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      logMedicalEvent('patient_accessed', patient.id, req.user.id, {
        accessed_by: req.user.role
      });

      res.json({
        success: true,
        data: patient
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch patient',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Update patient information
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Patient'
 *     responses:
 *       200:
 *         description: Patient updated successfully
 *       404:
 *         description: Patient not found
 */
router.put('/:id',
  authorize('admin', 'receptionist', 'doctor'),
  [
    param('id').isUUID().withMessage('Valid patient ID required'),
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
    body('last_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    body('email').optional().isEmail().withMessage('Valid email required')
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

      const patient = await Patient.findOne({
        where: { id: req.params.id, is_active: true }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Store original data for audit
      const originalData = patient.toJSON();

      await patient.update(req.body);

      logMedicalEvent('patient_updated', patient.id, req.user.id, {
        changes: req.body,
        original: originalData
      });

      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: patient
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update patient',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/patients/{id}/deactivate:
 *   patch:
 *     summary: Deactivate patient (soft delete)
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient deactivated successfully
 *       404:
 *         description: Patient not found
 */
router.patch('/:id/deactivate',
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Valid patient ID required')
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

      const patient = await Patient.findOne({
        where: { id: req.params.id, is_active: true }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      await patient.update({ is_active: false });

      logMedicalEvent('patient_deactivated', patient.id, req.user.id, {
        reason: req.body.reason || 'Not specified'
      });

      res.json({
        success: true,
        message: 'Patient deactivated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate patient',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/patients/search/phone/{phone}:
 *   get:
 *     summary: Search patient by phone number
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Phone number
 *     responses:
 *       200:
 *         description: Patient found
 *       404:
 *         description: Patient not found
 */
router.get('/search/phone/:phone',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    param('phone').isMobilePhone().withMessage('Valid phone number required')
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

      const patient = await Patient.findOne({
        where: { 
          phone: req.params.phone,
          is_active: true 
        },
        attributes: { exclude: ['deleted_at'] }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found with this phone number'
        });
      }

      res.json({
        success: true,
        data: patient
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to search patient',
        error: error.message
      });
    }
  }
);

module.exports = router;