const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Op } = require('sequelize');
const { OPDAppointment, Patient, Staff, Department } = require('../models');
const { authorize } = require('../middleware/authMiddleware');
const { logMedicalEvent } = require('../config/logger');
const router = express.Router();

// Generate unique appointment number
const generateAppointmentNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await OPDAppointment.count({
    where: {
      appointment_number: {
        [Op.like]: `OPD${dateStr}%`
      }
    }
  });
  return `OPD${dateStr}${String(count + 1).padStart(4, '0')}`;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     OPDAppointment:
 *       type: object
 *       required:
 *         - patient_id
 *         - doctor_id
 *         - appointment_date
 *         - appointment_time
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         appointment_number:
 *           type: string
 *         patient_id:
 *           type: string
 *           format: uuid
 *         doctor_id:
 *           type: string
 *           format: uuid
 *         department_id:
 *           type: string
 *           format: uuid
 *         appointment_date:
 *           type: string
 *           format: date
 *         appointment_time:
 *           type: string
 *           format: time
 *         appointment_type:
 *           type: string
 *           enum: [consultation, follow_up, emergency, routine_checkup]
 *         status:
 *           type: string
 *           enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show]
 *         chief_complaint:
 *           type: string
 *         consultation_fee:
 *           type: number
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /api/opd/appointments:
 *   post:
 *     summary: Book new OPD appointment
 *     tags: [OPD]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OPDAppointment'
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Time slot not available
 */
router.post('/appointments',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    body('patient_id').isUUID().withMessage('Valid patient ID required'),
    body('doctor_id').isUUID().withMessage('Valid doctor ID required'),
    body('department_id').optional().isUUID().withMessage('Valid department ID required'),
    body('appointment_date').isISO8601().withMessage('Valid appointment date required'),
    body('appointment_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
    body('appointment_type').isIn(['consultation', 'follow_up', 'emergency', 'routine_checkup']).withMessage('Valid appointment type required'),
    body('chief_complaint').optional().trim().isLength({ max: 500 }).withMessage('Chief complaint too long'),
    body('consultation_fee').optional().isFloat({ min: 0 }).withMessage('Valid consultation fee required')
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

      const { patient_id, doctor_id, appointment_date, appointment_time } = req.body;

      // Check if patient exists
      const patient = await Patient.findByPk(patient_id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Check if doctor exists
      const doctor = await Staff.findByPk(doctor_id);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      // Check if time slot is available
      const existingAppointment = await OPDAppointment.findOne({
        where: {
          doctor_id,
          appointment_date,
          appointment_time,
          status: {
            [Op.notIn]: ['cancelled', 'no_show']
          }
        }
      });

      if (existingAppointment) {
        return res.status(409).json({
          success: false,
          message: 'Time slot not available'
        });
      }

      // Generate appointment number
      const appointmentNumber = await generateAppointmentNumber();

      // Create appointment
      const appointment = await OPDAppointment.create({
        ...req.body,
        appointment_number: appointmentNumber,
        status: 'scheduled'
      });

      // Fetch complete appointment data
      const completeAppointment = await OPDAppointment.findByPk(appointment.id, {
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patient_id', 'first_name', 'last_name', 'phone']
          },
          {
            model: Staff,
            as: 'doctor',
            attributes: ['id', 'first_name', 'last_name', 'specialization']
          },
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      logMedicalEvent('opd_appointment_booked', patient_id, req.user.id, {
        appointment_id: appointment.id,
        appointment_number: appointmentNumber,
        doctor_id,
        appointment_date,
        appointment_time
      });

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: completeAppointment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to book appointment',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/opd/appointments:
 *   get:
 *     summary: Get OPD appointments with filters
 *     tags: [OPD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by appointment date
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: string
 *         description: Filter by doctor ID
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by appointment status
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: string
 *         description: Filter by department ID
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/appointments',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    query('date').optional().isISO8601().withMessage('Valid date required'),
    query('doctor_id').optional().isUUID().withMessage('Valid doctor ID required'),
    query('patient_id').optional().isUUID().withMessage('Valid patient ID required'),
    query('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Valid status required'),
    query('department_id').optional().isUUID().withMessage('Valid department ID required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

      // Build where clause
      let whereClause = {};

      if (req.query.date) {
        whereClause.appointment_date = req.query.date;
      }

      if (req.query.doctor_id) {
        whereClause.doctor_id = req.query.doctor_id;
      }

      if (req.query.patient_id) {
        whereClause.patient_id = req.query.patient_id;
      }

      if (req.query.status) {
        whereClause.status = req.query.status;
      }

      if (req.query.department_id) {
        whereClause.department_id = req.query.department_id;
      }

      // If user is a doctor, only show their appointments
      if (req.user.role === 'doctor') {
        const staff = await Staff.findOne({ where: { user_id: req.user.id } });
        if (staff) {
          whereClause.doctor_id = staff.id;
        }
      }

      const { count, rows: appointments } = await OPDAppointment.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patient_id', 'first_name', 'last_name', 'phone', 'age']
          },
          {
            model: Staff,
            as: 'doctor',
            attributes: ['id', 'first_name', 'last_name', 'specialization']
          },
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code']
          }
        ],
        limit,
        offset,
        order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          appointments,
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
        message: 'Failed to fetch appointments',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/opd/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [OPD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment details
 *       404:
 *         description: Appointment not found
 */
router.get('/appointments/:id',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    param('id').isUUID().withMessage('Valid appointment ID required')
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

      const appointment = await OPDAppointment.findByPk(req.params.id, {
        include: [
          {
            model: Patient,
            as: 'patient'
          },
          {
            model: Staff,
            as: 'doctor'
          },
          {
            model: Department,
            as: 'department'
          }
        ]
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Check if doctor can only see their own appointments
      if (req.user.role === 'doctor') {
        const staff = await Staff.findOne({ where: { user_id: req.user.id } });
        if (staff && appointment.doctor_id !== staff.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch appointment',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/opd/appointments/{id}:
 *   put:
 *     summary: Update appointment
 *     tags: [OPD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appointment_date:
 *                 type: string
 *                 format: date
 *               appointment_time:
 *                 type: string
 *                 format: time
 *               chief_complaint:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *       404:
 *         description: Appointment not found
 */
router.put('/appointments/:id',
  authorize('admin', 'receptionist', 'doctor'),
  [
    param('id').isUUID().withMessage('Valid appointment ID required'),
    body('appointment_date').optional().isISO8601().withMessage('Valid appointment date required'),
    body('appointment_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required'),
    body('chief_complaint').optional().trim().isLength({ max: 500 }).withMessage('Chief complaint too long'),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long')
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

      const appointment = await OPDAppointment.findByPk(req.params.id);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Check if appointment can be updated
      if (appointment.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update completed appointment'
        });
      }

      // If changing date/time, check availability
      if (req.body.appointment_date || req.body.appointment_time) {
        const newDate = req.body.appointment_date || appointment.appointment_date;
        const newTime = req.body.appointment_time || appointment.appointment_time;

        const conflictingAppointment = await OPDAppointment.findOne({
          where: {
            id: { [Op.ne]: appointment.id },
            doctor_id: appointment.doctor_id,
            appointment_date: newDate,
            appointment_time: newTime,
            status: { [Op.notIn]: ['cancelled', 'no_show'] }
          }
        });

        if (conflictingAppointment) {
          return res.status(409).json({
            success: false,
            message: 'Time slot not available'
          });
        }
      }

      // Store original data for audit
      const originalData = appointment.toJSON();

      await appointment.update(req.body);

      logMedicalEvent('opd_appointment_updated', appointment.patient_id, req.user.id, {
        appointment_id: appointment.id,
        changes: req.body,
        original: originalData
      });

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        data: appointment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update appointment',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/opd/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status
 *     tags: [OPD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, in_progress, completed, cancelled, no_show]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch('/appointments/:id/status',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    param('id').isUUID().withMessage('Valid appointment ID required'),
    body('status').isIn(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Valid status required'),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long')
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

      const appointment = await OPDAppointment.findByPk(req.params.id);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      const { status, notes } = req.body;
      const previousStatus = appointment.status;

      await appointment.update({
        status,
        notes: notes || appointment.notes
      });

      logMedicalEvent('opd_appointment_status_changed', appointment.patient_id, req.user.id, {
        appointment_id: appointment.id,
        previous_status: previousStatus,
        new_status: status,
        notes
      });

      res.json({
        success: true,
        message: 'Appointment status updated successfully',
        data: appointment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update appointment status',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/opd/appointments/today:
 *   get:
 *     summary: Get today's appointments
 *     tags: [OPD]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's appointments
 */
router.get('/appointments/today',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let whereClause = {
        appointment_date: today
      };

      // If user is a doctor, only show their appointments
      if (req.user.role === 'doctor') {
        const staff = await Staff.findOne({ where: { user_id: req.user.id } });
        if (staff) {
          whereClause.doctor_id = staff.id;
        }
      }

      const appointments = await OPDAppointment.findAll({
        where: whereClause,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patient_id', 'first_name', 'last_name', 'phone']
          },
          {
            model: Staff,
            as: 'doctor',
            attributes: ['id', 'first_name', 'last_name', 'specialization']
          }
        ],
        order: [['appointment_time', 'ASC']]
      });

      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s appointments',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/opd/doctor-schedule/{doctor_id}:
 *   get:
 *     summary: Get doctor's schedule for a date range
 *     tags: [OPD]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctor_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *     responses:
 *       200:
 *         description: Doctor's schedule
 */
router.get('/doctor-schedule/:doctor_id',
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    param('doctor_id').isUUID().withMessage('Valid doctor ID required'),
    query('start_date').optional().isISO8601().withMessage('Valid start date required'),
    query('end_date').optional().isISO8601().withMessage('Valid end date required')
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

      const { doctor_id } = req.params;
      const startDate = req.query.start_date || new Date().toISOString().split('T')[0];
      const endDate = req.query.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const appointments = await OPDAppointment.findAll({
        where: {
          doctor_id,
          appointment_date: {
            [Op.between]: [startDate, endDate]
          },
          status: {
            [Op.notIn]: ['cancelled', 'no_show']
          }
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patient_id', 'first_name', 'last_name']
          }
        ],
        order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']]
      });

      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch doctor schedule',
        error: error.message
      });
    }
  }
);

module.exports = router;