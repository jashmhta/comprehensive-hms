import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  Card,
  Title,
  Paragraph,
  Avatar,
  Button,
  Chip,
  ProgressBar,
  FAB,
  Portal,
  Modal,
  List
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { format } from 'date-fns';

// Redux actions
import { fetchDashboardStats } from '../../store/slices/analyticsSlice';
import { fetchTodayAppointments } from '../../store/slices/opdSlice';
import { fetchNotifications } from '../../store/slices/notificationSlice';

// Components
import StatCard from '../../components/dashboard/StatCard';
import QuickActionCard from '../../components/dashboard/QuickActionCard';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import NotificationBadge from '../../components/common/NotificationBadge';
import LoadingOverlay from '../../components/common/LoadingOverlay';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { dashboardStats, loading } = useSelector((state) => state.analytics);
  const { todayAppointments } = useSelector((state) => state.opd);
  const { notifications, unreadCount } = useSelector((state) => state.notifications);

  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        dispatch(fetchDashboardStats()),
        dispatch(fetchTodayAppointments()),
        dispatch(fetchNotifications({ limit: 5 }))
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserDisplayName = () => {
    if (user?.staff) {
      return `Dr. ${user.staff.first_name} ${user.staff.last_name}`;
    }
    return user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username;
  };

  const getRoleBasedStats = () => {
    const baseStats = [
      {
        title: 'Today\'s Appointments',
        value: todayAppointments?.length || 0,
        icon: 'event',
        color: '#1976d2',
        onPress: () => navigation.navigate('Appointments')
      }
    ];

    switch (user?.role) {
      case 'doctor':
        return [
          ...baseStats,
          {
            title: 'Patients Seen',
            value: dashboardStats?.patientsSeen || 0,
            icon: 'people',
            color: '#2e7d32'
          },
          {
            title: 'Pending Consultations',
            value: dashboardStats?.pendingConsultations || 0,
            icon: 'assignment',
            color: '#ed6c02'
          }
        ];

      case 'nurse':
        return [
          ...baseStats,
          {
            title: 'Patients Assigned',
            value: dashboardStats?.assignedPatients || 0,
            icon: 'local-hospital',
            color: '#2e7d32'
          },
          {
            title: 'Medications Due',
            value: dashboardStats?.medicationsDue || 0,
            icon: 'medication',
            color: '#d32f2f'
          }
        ];

      case 'receptionist':
        return [
          ...baseStats,
          {
            title: 'New Registrations',
            value: dashboardStats?.newRegistrations || 0,
            icon: 'person-add',
            color: '#2e7d32'
          },
          {
            title: 'Pending Bills',
            value: dashboardStats?.pendingBills || 0,
            icon: 'receipt',
            color: '#ed6c02'
          }
        ];

      case 'patient':
        return [
          {
            title: 'Upcoming Appointments',
            value: dashboardStats?.upcomingAppointments || 0,
            icon: 'event',
            color: '#1976d2',
            onPress: () => navigation.navigate('Appointments')
          },
          {
            title: 'Pending Reports',
            value: dashboardStats?.pendingReports || 0,
            icon: 'assignment',
            color: '#ed6c02',
            onPress: () => navigation.navigate('Reports')
          },
          {
            title: 'Outstanding Bills',
            value: dashboardStats?.outstandingBills || 0,
            icon: 'receipt',
            color: '#d32f2f',
            onPress: () => navigation.navigate('Bills')
          }
        ];

      default:
        return baseStats;
    }
  };

  const getQuickActions = () => {
    switch (user?.role) {
      case 'doctor':
        return [
          {
            title: 'View Schedule',
            icon: 'schedule',
            color: '#1976d2',
            onPress: () => navigation.navigate('Schedule')
          },
          {
            title: 'Patient List',
            icon: 'people',
            color: '#2e7d32',
            onPress: () => navigation.navigate('Patients')
          },
          {
            title: 'Prescriptions',
            icon: 'local-pharmacy',
            color: '#7b1fa2',
            onPress: () => navigation.navigate('Prescriptions')
          },
          {
            title: 'Lab Reports',
            icon: 'science',
            color: '#ed6c02',
            onPress: () => navigation.navigate('LabReports')
          }
        ];

      case 'nurse':
        return [
          {
            title: 'Patient Care',
            icon: 'local-hospital',
            color: '#1976d2',
            onPress: () => navigation.navigate('PatientCare')
          },
          {
            title: 'Medications',
            icon: 'medication',
            color: '#2e7d32',
            onPress: () => navigation.navigate('Medications')
          },
          {
            title: 'Vital Signs',
            icon: 'favorite',
            color: '#d32f2f',
            onPress: () => navigation.navigate('VitalSigns')
          }
        ];

      case 'receptionist':
        return [
          {
            title: 'Register Patient',
            icon: 'person-add',
            color: '#1976d2',
            onPress: () => navigation.navigate('AddPatient')
          },
          {
            title: 'Book Appointment',
            icon: 'event',
            color: '#2e7d32',
            onPress: () => navigation.navigate('BookAppointment')
          },
          {
            title: 'Billing',
            icon: 'receipt',
            color: '#ed6c02',
            onPress: () => navigation.navigate('Billing')
          }
        ];

      case 'patient':
        return [
          {
            title: 'Book Appointment',
            icon: 'event',
            color: '#1976d2',
            onPress: () => navigation.navigate('BookAppointmentPatient')
          },
          {
            title: 'View Reports',
            icon: 'assignment',
            color: '#2e7d32',
            onPress: () => navigation.navigate('Reports')
          },
          {
            title: 'Pay Bills',
            icon: 'payment',
            color: '#ed6c02',
            onPress: () => navigation.navigate('Bills')
          }
        ];

      default:
        return [];
    }
  };

  // Sample chart data
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 50],
        color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#1976d2'
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{getUserDisplayName()}</Text>
              <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM do')}</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications" size={24} color="#1976d2" />
              {unreadCount > 0 && (
                <NotificationBadge count={unreadCount} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {getRoleBasedStats().map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </View>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.quickActionsGrid}>
              {getQuickActions().map((action, index) => (
                <QuickActionCard key={index} {...action} />
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Today's Appointments */}
        {todayAppointments && todayAppointments.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Title>Today's Appointments</Title>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Appointments')}
                >
                  View All
                </Button>
              </View>
              {todayAppointments.slice(0, 3).map((appointment, index) => (
                <AppointmentCard
                  key={index}
                  appointment={appointment}
                  onPress={() => navigation.navigate('AppointmentDetail', { id: appointment.id })}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Activity Chart */}
        {user?.role !== 'patient' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Weekly Activity</Title>
              <LineChart
                data={chartData}
                width={width - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </Card.Content>
          </Card>
        )}

        {/* Recent Notifications */}
        {notifications && notifications.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Title>Recent Notifications</Title>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Notifications')}
                >
                  View All
                </Button>
              </View>
              {notifications.slice(0, 3).map((notification, index) => (
                <List.Item
                  key={index}
                  title={notification.title}
                  description={notification.message}
                  left={(props) => (
                    <Avatar.Icon
                      {...props}
                      icon={notification.type === 'appointment' ? 'event' : 'info'}
                      size={40}
                    />
                  )}
                  right={(props) => (
                    <Text style={styles.notificationTime}>
                      {format(new Date(notification.created_at), 'HH:mm')}
                    </Text>
                  )}
                />
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {user?.role !== 'patient' && (
        <Portal>
          <FAB.Group
            open={fabOpen}
            icon={fabOpen ? 'close' : 'add'}
            actions={[
              {
                icon: 'person-add',
                label: 'Add Patient',
                onPress: () => navigation.navigate('AddPatient'),
              },
              {
                icon: 'event',
                label: 'Book Appointment',
                onPress: () => navigation.navigate('BookAppointment'),
              },
              {
                icon: 'receipt',
                label: 'Create Bill',
                onPress: () => navigation.navigate('CreateBill'),
              },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
            onPress={() => {
              if (fabOpen) {
                // do something if the speed dial is open
              }
            }}
          />
        </Portal>
      )}

      {loading && <LoadingOverlay />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1976d2',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  date: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginTop: -30,
  },
  card: {
    margin: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'center',
  },
});

export default DashboardScreen;