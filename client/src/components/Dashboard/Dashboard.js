import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Button,
  Chip,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert
} from '@mui/material';
import {
  People,
  LocalHospital,
  Emergency,
  Medication,
  Science,
  MonetizationOn,
  TrendingUp,
  TrendingDown,
  Refresh,
  Notifications,
  CalendarToday,
  BedOutlined,
  PersonAdd,
  Assignment
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, startOfDay, endOfDay } from 'date-fns';

// Redux actions
import { fetchDashboardStats } from '../../store/slices/analyticsSlice';
import { fetchTodayAppointments } from '../../store/slices/opdSlice';
import { fetchRecentAdmissions } from '../../store/slices/ipdSlice';
import { fetchEmergencyCases } from '../../store/slices/emergencySlice';

// Components
import StatCard from './StatCard';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import AlertsPanel from './AlertsPanel';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { dashboardStats, loading } = useSelector((state) => state.analytics);
  const { todayAppointments } = useSelector((state) => state.opd);
  const { recentAdmissions } = useSelector((state) => state.ipd);
  const { emergencyCases } = useSelector((state) => state.emergency);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [dispatch]);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchDashboardStats()),
        dispatch(fetchTodayAppointments()),
        dispatch(fetchRecentAdmissions()),
        dispatch(fetchEmergencyCases({ status: 'active' }))
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  // Sample data for charts (replace with real data)
  const patientFlowData = [
    { name: 'Mon', opd: 45, ipd: 12, emergency: 8 },
    { name: 'Tue', opd: 52, ipd: 15, emergency: 6 },
    { name: 'Wed', opd: 48, ipd: 18, emergency: 10 },
    { name: 'Thu', opd: 61, ipd: 14, emergency: 7 },
    { name: 'Fri', opd: 55, ipd: 16, emergency: 9 },
    { name: 'Sat', opd: 38, ipd: 11, emergency: 5 },
    { name: 'Sun', opd: 28, ipd: 8, emergency: 4 }
  ];

  const revenueData = [
    { name: 'Jan', revenue: 125000, expenses: 85000 },
    { name: 'Feb', revenue: 135000, expenses: 88000 },
    { name: 'Mar', revenue: 148000, expenses: 92000 },
    { name: 'Apr', revenue: 142000, expenses: 89000 },
    { name: 'May', revenue: 156000, expenses: 95000 },
    { name: 'Jun', revenue: 168000, expenses: 98000 }
  ];

  const departmentData = [
    { name: 'Cardiology', value: 25, color: '#8884d8' },
    { name: 'Orthopedics', value: 20, color: '#82ca9d' },
    { name: 'Neurology', value: 15, color: '#ffc658' },
    { name: 'Pediatrics', value: 18, color: '#ff7300' },
    { name: 'General Medicine', value: 22, color: '#00ff00' }
  ];

  const bedOccupancyData = [
    { name: 'ICU', occupied: 18, total: 20 },
    { name: 'General', occupied: 85, total: 100 },
    { name: 'Private', occupied: 28, total: 35 },
    { name: 'Emergency', occupied: 12, total: 15 }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getRoleBasedStats = () => {
    const baseStats = [
      {
        title: 'Total Patients',
        value: dashboardStats?.totalPatients || 0,
        change: '+12%',
        trend: 'up',
        icon: People,
        color: '#1976d2'
      },
      {
        title: 'Today\'s Appointments',
        value: todayAppointments?.length || 0,
        change: '+5%',
        trend: 'up',
        icon: CalendarToday,
        color: '#2e7d32'
      },
      {
        title: 'Active Admissions',
        value: dashboardStats?.activeAdmissions || 0,
        change: '-3%',
        trend: 'down',
        icon: BedOutlined,
        color: '#ed6c02'
      },
      {
        title: 'Emergency Cases',
        value: emergencyCases?.length || 0,
        change: '+8%',
        trend: 'up',
        icon: Emergency,
        color: '#d32f2f'
      }
    ];

    if (user?.role === 'admin' || user?.role === 'accountant') {
      baseStats.push({
        title: 'Today\'s Revenue',
        value: `₹${dashboardStats?.todayRevenue?.toLocaleString() || 0}`,
        change: '+15%',
        trend: 'up',
        icon: MonetizationOn,
        color: '#7b1fa2'
      });
    }

    if (user?.role === 'pharmacist') {
      baseStats.push({
        title: 'Low Stock Items',
        value: dashboardStats?.lowStockItems || 0,
        change: 'Alert',
        trend: 'alert',
        icon: Medication,
        color: '#f57c00'
      });
    }

    if (user?.role === 'lab_technician') {
      baseStats.push({
        title: 'Pending Tests',
        value: dashboardStats?.pendingTests || 0,
        change: '+2%',
        trend: 'up',
        icon: Science,
        color: '#5e35b1'
      });
    }

    return baseStats;
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {getGreeting()}, {user?.staff?.first_name || user?.username}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<Notifications />}
            onClick={() => {/* TODO: Open notifications */}}
          >
            Notifications
          </Button>
        </Box>
      </Box>

      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {getRoleBasedStats().map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          {/* Patient Flow Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Patient Flow
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={patientFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="opd" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="ipd" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="emergency" stackId="1" stroke="#ffc658" fill="#ffc658" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          {(user?.role === 'admin' || user?.role === 'accountant') && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue vs Expenses
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" />
                    <Bar dataKey="expenses" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Bed Occupancy */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bed Occupancy Status
              </Typography>
              <Grid container spacing={2}>
                {bedOccupancyData.map((ward, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{ward.name}</Typography>
                        <Typography variant="body2">
                          {ward.occupied}/{ward.total}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(ward.occupied / ward.total) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#f0f0f0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: ward.occupied / ward.total > 0.8 ? '#f44336' : '#4caf50'
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          {/* Quick Actions */}
          <QuickActions userRole={user?.role} />

          {/* Department Distribution */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Department Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <RecentActivity />

          {/* Alerts Panel */}
          <AlertsPanel />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;