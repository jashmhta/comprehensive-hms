import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Container,
  Paper,
  Grid,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  LocalHospital,
  Security
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

// Redux actions
import { login, clearError, checkLockoutExpiry } from '../../store/slices/authSlice';

// Validation schema
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  twoFactorToken: Yup.string()
    .when('twoFactorRequired', {
      is: true,
      then: Yup.string()
        .length(6, '2FA token must be 6 digits')
        .matches(/^\d+$/, '2FA token must contain only numbers')
        .required('2FA token is required')
    })
});

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, twoFactorRequired, accountLocked, lockoutTime } = useSelector(
    (state) => state.auth
  );

  const [showPassword, setShowPassword] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);

  useEffect(() => {
    // Clear any existing errors
    dispatch(clearError());
    
    // Check if lockout has expired
    dispatch(checkLockoutExpiry());
  }, [dispatch]);

  useEffect(() => {
    // Update lockout timer
    if (accountLocked && lockoutTime) {
      const timer = setInterval(() => {
        const remaining = Math.max(0, lockoutTime - Date.now());
        setLockoutTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          dispatch(checkLockoutExpiry());
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [accountLocked, lockoutTime, dispatch]);

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      const result = await dispatch(login(values));
      
      if (login.fulfilled.match(result)) {
        if (result.payload.twoFactorRequired) {
          toast.info('Please enter your 2FA code');
        } else {
          toast.success('Login successful!');
          navigate('/dashboard');
        }
      } else if (login.rejected.match(result)) {
        const errorMessage = result.payload || 'Login failed';
        setFieldError('general', errorMessage);
      }
    } catch (error) {
      setFieldError('general', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Grid container spacing={0} sx={{ minHeight: '80vh' }}>
        {/* Left Side - Branding */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              p: 4
            }}
          >
            <LocalHospital sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom align="center" fontWeight="bold">
              Hospital Management System
            </Typography>
            <Typography variant="h6" align="center" sx={{ opacity: 0.9, mb: 4 }}>
              Comprehensive healthcare management solution for modern hospitals
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ✓ Patient Management
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ✓ OPD & IPD Management
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ✓ Pharmacy & Laboratory
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ✓ Billing & Insurance
              </Typography>
              <Typography variant="body1">
                ✓ Analytics & Reports
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Right Side - Login Form */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              p: 4
            }}
          >
            <Box sx={{ maxWidth: 400, mx: 'auto', width: '100%' }}>
              <Typography variant="h4" component="h2" gutterBottom align="center" fontWeight="bold">
                Welcome Back
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
                Sign in to your account to continue
              </Typography>

              {accountLocked && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  Account is locked due to multiple failed login attempts.
                  {lockoutTimeRemaining > 0 && (
                    <> Try again in {formatTime(lockoutTimeRemaining)}.</>
                  )}
                </Alert>
              )}

              <Formik
                initialValues={{
                  email: '',
                  password: '',
                  twoFactorToken: ''
                }}
                validationSchema={loginSchema}
                onSubmit={handleSubmit}
              >
                {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                  <Form>
                    <Field name="email">
                      {({ field, meta }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email Address"
                          type="email"
                          margin="normal"
                          variant="outlined"
                          disabled={accountLocked || isSubmitting}
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    </Field>

                    <Field name="password">
                      {({ field, meta }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          margin="normal"
                          variant="outlined"
                          disabled={accountLocked || isSubmitting}
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  disabled={accountLocked || isSubmitting}
                                >
                                  {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    </Field>

                    {twoFactorRequired && (
                      <>
                        <Divider sx={{ my: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Two-Factor Authentication
                          </Typography>
                        </Divider>
                        
                        <Field name="twoFactorToken">
                          {({ field, meta }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="2FA Code"
                              type="text"
                              margin="normal"
                              variant="outlined"
                              placeholder="Enter 6-digit code"
                              disabled={accountLocked || isSubmitting}
                              error={meta.touched && !!meta.error}
                              helperText={meta.touched && meta.error}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Security color="action" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                        </Field>
                      </>
                    )}

                    {errors.general && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {errors.general}
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={accountLocked || isSubmitting}
                      sx={{
                        mt: 3,
                        mb: 2,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {isSubmitting ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : twoFactorRequired ? (
                        'Verify & Sign In'
                      ) : (
                        'Sign In'
                      )}
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Forgot your password?{' '}
                        <Button
                          variant="text"
                          size="small"
                          disabled={accountLocked || isSubmitting}
                          onClick={() => {
                            // TODO: Implement forgot password
                            toast.info('Please contact your administrator');
                          }}
                        >
                          Contact Administrator
                        </Button>
                      </Typography>
                    </Box>
                  </Form>
                )}
              </Formik>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Demo Credentials:
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Admin: admin@hospital.com / admin123
                </Typography>
                <Typography variant="caption" display="block">
                  Doctor: doctor@hospital.com / doctor123
                </Typography>
                <Typography variant="caption" display="block">
                  Nurse: nurse@hospital.com / nurse123
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Login;