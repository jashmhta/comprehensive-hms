import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';

// Components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import PatientManagement from './components/Patient/PatientManagement';
import OPDManagement from './components/OPD/OPDManagement';
import IPDManagement from './components/IPD/IPDManagement';
import PharmacyManagement from './components/Pharmacy/PharmacyManagement';
import LabManagement from './components/Laboratory/LabManagement';
import RadiologyManagement from './components/Radiology/RadiologyManagement';
import BillingManagement from './components/Billing/BillingManagement';
import EmergencyManagement from './components/Emergency/EmergencyManagement';
import BloodBankManagement from './components/BloodBank/BloodBankManagement';
import OTManagement from './components/OT/OTManagement';
import AmbulanceManagement from './components/Ambulance/AmbulanceManagement';
import HRManagement from './components/HR/HRManagement';
import AnalyticsReports from './components/Analytics/AnalyticsReports';
import Settings from './components/Settings/Settings';
import Profile from './components/Profile/Profile';
import NotFound from './components/Common/NotFound';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Redux
import { checkAuthStatus } from './store/slices/authSlice';
import { initializeSocket } from './store/slices/socketSlice';

// Styles
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#2e7d32',
    },
    warning: {
      main: '#ed6c02',
    },
    error: {
      main: '#d32f2f',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check authentication status on app load
    dispatch(checkAuthStatus());
  }, [dispatch]);

  useEffect(() => {
    // Initialize socket connection when authenticated
    if (isAuthenticated) {
      dispatch(initializeSocket());
    }
  }, [isAuthenticated, dispatch]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <LoadingSpinner />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
                }
              />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                {/* Dashboard */}
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Patient Management */}
                <Route
                  path="patients/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
                      <PatientManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* OPD Management */}
                <Route
                  path="opd/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
                      <OPDManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* IPD Management */}
                <Route
                  path="ipd/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
                      <IPDManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Pharmacy Management */}
                <Route
                  path="pharmacy/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pharmacist', 'doctor']}>
                      <PharmacyManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Laboratory Management */}
                <Route
                  path="laboratory/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'doctor']}>
                      <LabManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Radiology Management */}
                <Route
                  path="radiology/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'radiologist', 'doctor']}>
                      <RadiologyManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Billing Management */}
                <Route
                  path="billing/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'accountant', 'receptionist']}>
                      <BillingManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Emergency Management */}
                <Route
                  path="emergency/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
                      <EmergencyManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Blood Bank Management */}
                <Route
                  path="blood-bank/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'doctor']}>
                      <BloodBankManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Operation Theatre Management */}
                <Route
                  path="operation-theatre/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
                      <OTManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Ambulance Management */}
                <Route
                  path="ambulance/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'receptionist']}>
                      <AmbulanceManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* HR Management */}
                <Route
                  path="hr/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'hr_manager']}>
                      <HRManagement />
                    </ProtectedRoute>
                  }
                />
                
                {/* Analytics & Reports */}
                <Route
                  path="analytics/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'doctor', 'accountant']}>
                      <AnalyticsReports />
                    </ProtectedRoute>
                  }
                />
                
                {/* Settings */}
                <Route
                  path="settings/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                
                {/* Profile */}
                <Route path="profile" element={<Profile />} />
                
                {/* 404 Not Found */}
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            {/* Toast Notifications */}
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;