import React from 'react';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PatientListScreen from '../screens/patients/PatientListScreen';
import PatientDetailScreen from '../screens/patients/PatientDetailScreen';
import AddPatientScreen from '../screens/patients/AddPatientScreen';
import AppointmentListScreen from '../screens/appointments/AppointmentListScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import BookAppointmentScreen from '../screens/appointments/BookAppointmentScreen';
import PrescriptionScreen from '../screens/prescriptions/PrescriptionScreen';
import LabReportsScreen from '../screens/lab/LabReportsScreen';
import BillingScreen from '../screens/billing/BillingScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

// Doctor Specific Screens
import DoctorScheduleScreen from '../screens/doctor/DoctorScheduleScreen';
import PatientConsultationScreen from '../screens/doctor/PatientConsultationScreen';
import EPrescriptionScreen from '../screens/doctor/EPrescriptionScreen';

// Patient Specific Screens
import MyAppointmentsScreen from '../screens/patient/MyAppointmentsScreen';
import MyReportsScreen from '../screens/patient/MyReportsScreen';
import MyBillsScreen from '../screens/patient/MyBillsScreen';
import BookAppointmentPatientScreen from '../screens/patient/BookAppointmentPatientScreen';

// Components
import CustomDrawerContent from '../components/navigation/CustomDrawerContent';
import LoadingScreen from '../components/common/LoadingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#fff' }
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

// Patient Tab Navigator
const PatientTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Dashboard':
            iconName = 'dashboard';
            break;
          case 'Appointments':
            iconName = 'event';
            break;
          case 'Reports':
            iconName = 'assignment';
            break;
          case 'Bills':
            iconName = 'receipt';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'circle';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1976d2',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Appointments" component={MyAppointmentsScreen} />
    <Tab.Screen name="Reports" component={MyReportsScreen} />
    <Tab.Screen name="Bills" component={MyBillsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Doctor Tab Navigator
const DoctorTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Dashboard':
            iconName = 'dashboard';
            break;
          case 'Schedule':
            iconName = 'schedule';
            break;
          case 'Patients':
            iconName = 'people';
            break;
          case 'Prescriptions':
            iconName = 'local-pharmacy';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'circle';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1976d2',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Schedule" component={DoctorScheduleScreen} />
    <Tab.Screen name="Patients" component={PatientListScreen} />
    <Tab.Screen name="Prescriptions" component={PrescriptionScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Staff Tab Navigator (Nurse, Receptionist, etc.)
const StaffTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Dashboard':
            iconName = 'dashboard';
            break;
          case 'Patients':
            iconName = 'people';
            break;
          case 'Appointments':
            iconName = 'event';
            break;
          case 'Billing':
            iconName = 'receipt';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'circle';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1976d2',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Patients" component={PatientListScreen} />
    <Tab.Screen name="Appointments" component={AppointmentListScreen} />
    <Tab.Screen name="Billing" component={BillingScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Main Stack Navigator
const MainStack = ({ userRole }) => {
  const getTabNavigator = () => {
    switch (userRole) {
      case 'patient':
        return PatientTabNavigator;
      case 'doctor':
        return DoctorTabNavigator;
      case 'nurse':
      case 'receptionist':
      case 'admin':
      case 'pharmacist':
      case 'lab_technician':
      default:
        return StaffTabNavigator;
    }
  };

  const TabNavigator = getTabNavigator();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1976d2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      
      {/* Common Screens */}
      <Stack.Screen 
        name="PatientDetail" 
        component={PatientDetailScreen}
        options={{ title: 'Patient Details' }}
      />
      <Stack.Screen 
        name="AddPatient" 
        component={AddPatientScreen}
        options={{ title: 'Add Patient' }}
      />
      <Stack.Screen 
        name="AppointmentDetail" 
        component={AppointmentDetailScreen}
        options={{ title: 'Appointment Details' }}
      />
      <Stack.Screen 
        name="BookAppointment" 
        component={BookAppointmentScreen}
        options={{ title: 'Book Appointment' }}
      />
      <Stack.Screen 
        name="LabReports" 
        component={LabReportsScreen}
        options={{ title: 'Lab Reports' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />

      {/* Doctor Specific Screens */}
      {userRole === 'doctor' && (
        <>
          <Stack.Screen 
            name="PatientConsultation" 
            component={PatientConsultationScreen}
            options={{ title: 'Patient Consultation' }}
          />
          <Stack.Screen 
            name="EPrescription" 
            component={EPrescriptionScreen}
            options={{ title: 'E-Prescription' }}
          />
        </>
      )}

      {/* Patient Specific Screens */}
      {userRole === 'patient' && (
        <Stack.Screen 
          name="BookAppointmentPatient" 
          component={BookAppointmentPatientScreen}
          options={{ title: 'Book Appointment' }}
        />
      )}
    </Stack.Navigator>
  );
};

// Drawer Navigator (for staff roles)
const DrawerNavigator = ({ userRole }) => (
  <Drawer.Navigator
    drawerContent={(props) => <CustomDrawerContent {...props} />}
    screenOptions={{
      headerShown: false,
      drawerStyle: {
        backgroundColor: '#fff',
        width: 280,
      },
      drawerActiveTintColor: '#1976d2',
      drawerInactiveTintColor: '#666',
    }}
  >
    <Drawer.Screen 
      name="Main" 
      children={() => <MainStack userRole={userRole} />}
      options={{
        drawerLabel: 'Dashboard',
        drawerIcon: ({ color, size }) => (
          <Icon name="dashboard" color={color} size={size} />
        ),
      }}
    />
  </Drawer.Navigator>
);

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  const userRole = user?.role || 'patient';

  // Use drawer navigation for staff roles, tab navigation for patients
  if (userRole === 'patient') {
    return <MainStack userRole={userRole} />;
  } else {
    return <DrawerNavigator userRole={userRole} />;
  }
};

export default AppNavigator;