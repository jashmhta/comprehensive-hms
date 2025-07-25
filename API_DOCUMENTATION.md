# API Documentation - Hospital Management System

## 🔗 Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## 🔐 Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "doctor@hospital.com",
  "password": "securePassword123",
  "twoFactorToken": "123456" // Optional, required if 2FA enabled
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "doctor@hospital.com",
      "role": "doctor",
      "staff": {
        "first_name": "Dr. John",
        "last_name": "Doe",
        "department": "Cardiology"
      }
    }
  }
}
```

### Authorization Header
```http
Authorization: Bearer <token>
```

## 👥 Patient Management

### Register New Patient
```http
POST /patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Smith",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "blood_group": "O+",
  "phone": "+1234567890",
  "email": "john.doe@email.com",
  "emergency_contact": "+1234567891",
  "emergency_contact_name": "Jane Doe",
  "address": "123 Main St, City, State 12345",
  "city": "New York",
  "state": "NY",
  "pincode": "10001",
  "nationality": "American",
  "marital_status": "single",
  "occupation": "Engineer",
  "insurance_provider": "Blue Cross",
  "insurance_policy_number": "BC123456789",
  "allergies": "Penicillin, Peanuts",
  "medical_history": "Hypertension, Diabetes Type 2"
}
```

### Get All Patients
```http
GET /patients?page=1&limit=20&search=john
Authorization: Bearer <token>
```

### Get Patient by ID
```http
GET /patients/{patient_id}
Authorization: Bearer <token>
```

### Update Patient
```http
PUT /patients/{patient_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+1234567890",
  "address": "456 New Address, City, State"
}
```

### Search Patient by Phone
```http
GET /patients/search/phone/{phone_number}
Authorization: Bearer <token>
```

## 🏥 OPD Management

### Book Appointment
```http
POST /opd/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "department_id": "uuid",
  "appointment_date": "2024-01-15",
  "appointment_time": "10:30:00",
  "appointment_type": "consultation",
  "chief_complaint": "Chest pain and shortness of breath",
  "consultation_fee": 500.00
}
```

### Get Appointments
```http
GET /opd/appointments?date=2024-01-15&doctor_id=uuid&status=scheduled
Authorization: Bearer <token>
```

### Update Appointment Status
```http
PATCH /opd/appointments/{appointment_id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "notes": "Patient examined, prescribed medication"
}
```

## 🛏️ IPD Management

### Admit Patient
```http
POST /ipd/admissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "bed_id": "uuid",
  "admission_date": "2024-01-15T10:30:00Z",
  "admission_type": "emergency",
  "diagnosis": "Acute myocardial infarction",
  "treatment_plan": "Cardiac catheterization, medication therapy"
}
```

### Get Admissions
```http
GET /ipd/admissions?status=admitted&ward_id=uuid
Authorization: Bearer <token>
```

### Discharge Patient
```http
PATCH /ipd/admissions/{admission_id}/discharge
Authorization: Bearer <token>
Content-Type: application/json

{
  "discharge_date": "2024-01-20T14:00:00Z",
  "discharge_summary": "Patient recovered well, discharged with medications",
  "follow_up_instructions": "Follow up in 1 week"
}
```

## 💊 Pharmacy Management

### Add Drug
```http
POST /pharmacy/drugs
Authorization: Bearer <token>
Content-Type: application/json

{
  "generic_name": "Paracetamol",
  "brand_name": "Crocin",
  "category_id": "uuid",
  "manufacturer": "GSK",
  "dosage_form": "tablet",
  "strength": "500mg",
  "unit_price": 2.50,
  "reorder_level": 100
}
```

### Add Inventory
```http
POST /pharmacy/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "drug_id": "uuid",
  "batch_number": "BATCH001",
  "expiry_date": "2025-12-31",
  "quantity_received": 1000,
  "purchase_price": 2.00,
  "supplier": "Pharma Distributor Ltd",
  "received_date": "2024-01-15"
}
```

### Dispense Medication
```http
POST /pharmacy/dispense
Authorization: Bearer <token>
Content-Type: application/json

{
  "prescription_id": "uuid",
  "patient_id": "uuid",
  "items": [
    {
      "drug_id": "uuid",
      "quantity": 30,
      "dosage": "1 tablet twice daily",
      "duration": "15 days"
    }
  ]
}
```

## 🧪 Laboratory Management

### Create Lab Order
```http
POST /lab/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "tests": [
    {
      "test_id": "uuid",
      "priority": "routine"
    },
    {
      "test_id": "uuid",
      "priority": "urgent"
    }
  ],
  "clinical_notes": "Patient presents with fever and fatigue"
}
```

### Update Test Results
```http
PUT /lab/orders/{order_id}/results
Authorization: Bearer <token>
Content-Type: application/json

{
  "test_results": [
    {
      "test_id": "uuid",
      "result_value": "120",
      "unit": "mg/dL",
      "normal_range": "70-100",
      "status": "abnormal",
      "comments": "Elevated glucose levels"
    }
  ],
  "technician_notes": "Sample processed successfully",
  "verified_by": "uuid"
}
```

## 🏥 Emergency Department

### Register Emergency Case
```http
POST /emergency/cases
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "triage_level": "critical",
  "arrival_time": "2024-01-15T15:30:00Z",
  "chief_complaint": "Severe chest pain",
  "vital_signs": {
    "blood_pressure": "180/110",
    "heart_rate": 120,
    "temperature": 98.6,
    "respiratory_rate": 22,
    "oxygen_saturation": 95
  },
  "assigned_doctor_id": "uuid"
}
```

### Update Triage
```http
PATCH /emergency/cases/{case_id}/triage
Authorization: Bearer <token>
Content-Type: application/json

{
  "triage_level": "urgent",
  "notes": "Patient stabilized, moved to urgent category"
}
```

## 🩸 Blood Bank Management

### Register Donor
```http
POST /blood-bank/donors
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "date_of_birth": "1985-05-20",
  "gender": "male",
  "blood_group": "O+",
  "phone": "+1234567890",
  "email": "john.smith@email.com",
  "address": "123 Donor St, City, State"
}
```

### Add Blood Unit
```http
POST /blood-bank/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "donor_id": "uuid",
  "blood_group": "O+",
  "component_type": "whole_blood",
  "collection_date": "2024-01-15",
  "expiry_date": "2024-02-15",
  "volume_ml": 450
}
```

### Issue Blood Unit
```http
POST /blood-bank/issue
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "blood_group": "O+",
  "component_type": "packed_rbc",
  "units_required": 2,
  "urgency": "stat",
  "cross_match_required": true,
  "requesting_doctor_id": "uuid"
}
```

## 💰 Billing Management

### Create Bill
```http
POST /billing/bills
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "admission_id": "uuid",
  "items": [
    {
      "item_code": "CONS001",
      "item_name": "Doctor Consultation",
      "quantity": 1,
      "unit_price": 500.00,
      "tax_percentage": 18.0
    },
    {
      "item_code": "LAB001",
      "item_name": "Blood Test",
      "quantity": 1,
      "unit_price": 200.00,
      "tax_percentage": 18.0
    }
  ],
  "discount_percentage": 10.0
}
```

### Process Payment
```http
POST /billing/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "bill_id": "uuid",
  "amount": 500.00,
  "payment_method": "card",
  "transaction_id": "TXN123456789",
  "payment_gateway": "razorpay"
}
```

## 🚑 Ambulance Management

### Request Ambulance
```http
POST /ambulance/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "pickup_location": "123 Emergency St, City",
  "destination": "City General Hospital",
  "urgency": "critical",
  "patient_condition": "Cardiac arrest",
  "contact_person": "John Doe",
  "contact_phone": "+1234567890"
}
```

### Assign Ambulance
```http
PATCH /ambulance/requests/{request_id}/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "ambulance_id": "uuid",
  "estimated_arrival": "2024-01-15T16:00:00Z"
}
```

## 📊 Analytics & Reports

### Dashboard Statistics
```http
GET /analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "opd_appointments": 45,
      "ipd_admissions": 12,
      "emergency_cases": 8,
      "surgeries": 5
    },
    "occupancy": {
      "total_beds": 200,
      "occupied_beds": 150,
      "occupancy_rate": 75.0
    },
    "revenue": {
      "today": 125000.00,
      "this_month": 3500000.00,
      "last_month": 3200000.00
    }
  }
}
```

### Patient Statistics
```http
GET /analytics/patients?period=monthly&year=2024
Authorization: Bearer <token>
```

### Revenue Reports
```http
GET /analytics/revenue?start_date=2024-01-01&end_date=2024-01-31&department=cardiology
Authorization: Bearer <token>
```

## 🔔 Notifications

### Send Notification
```http
POST /notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient_id": "uuid",
  "type": "appointment_reminder",
  "title": "Appointment Reminder",
  "message": "Your appointment is scheduled for tomorrow at 10:30 AM",
  "channels": ["email", "sms", "push"],
  "scheduled_time": "2024-01-14T18:00:00Z"
}
```

### Get Notifications
```http
GET /notifications?user_id=uuid&status=unread&limit=20
Authorization: Bearer <token>
```

## 📋 Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_records": 200,
      "per_page": 20
    }
  }
}
```

## 🔍 Query Parameters

### Common Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search term
- `sort`: Sort field
- `order`: Sort order (asc/desc)
- `status`: Filter by status
- `date`: Filter by date (YYYY-MM-DD)
- `start_date`: Start date for range
- `end_date`: End date for range

### Example
```http
GET /patients?page=2&limit=50&search=john&sort=created_at&order=desc&status=active
```

## 🚫 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## 🔒 Security Headers

All API responses include security headers:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## 📝 Rate Limiting

- **Authentication endpoints**: 10 requests per 15 minutes per IP
- **General API endpoints**: 100 requests per 15 minutes per user
- **File upload endpoints**: 20 requests per hour per user

## 🔄 WebSocket Events

### Real-time Notifications
```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join user room
socket.emit('join_room', `user_${userId}`);

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Listen for emergency alerts
socket.on('emergency_alert', (data) => {
  console.log('Emergency alert:', data);
});
```

## 📚 Additional Resources

- **Swagger Documentation**: `/api-docs`
- **Health Check**: `/health`
- **API Status**: `/status`
- **Version Info**: `/version`

## 🆘 Support

For API support:
- Email: api-support@hospital-hms.com
- Documentation: https://docs.hospital-hms.com/api
- GitHub Issues: https://github.com/jashmhta/comprehensive-hms/issues