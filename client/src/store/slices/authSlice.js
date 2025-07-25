import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

// Set auth token in axios headers
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null,
  twoFactorRequired: false,
  loginAttempts: 0,
  accountLocked: false,
  lockoutTime: null,
};

// Async thunks

// Login
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, twoFactorToken }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/login', {
        email,
        password,
        twoFactorToken,
      });

      const { token, user, twoFactorRequired } = response.data.data;

      if (twoFactorRequired) {
        return { twoFactorRequired: true };
      }

      setAuthToken(token);
      toast.success('Login successful!');
      
      return { token, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Register
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/register', userData);
      toast.success('Registration successful! Please login.');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Check auth status
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No token found');
      }

      setAuthToken(token);
      const response = await axios.get('/auth/me');
      return { token, user: response.data.data };
    } catch (error) {
      setAuthToken(null);
      return rejectWithValue('Token validation failed');
    }
  }
);

// Logout
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await axios.post('/auth/logout');
      setAuthToken(null);
      toast.success('Logged out successfully');
      return {};
    } catch (error) {
      // Even if logout fails on server, clear local state
      setAuthToken(null);
      return {};
    }
  }
);

// Change password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Enable 2FA
export const enableTwoFactor = createAsyncThunk(
  'auth/enableTwoFactor',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/enable-2fa');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to enable 2FA';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Verify 2FA setup
export const verifyTwoFactorSetup = createAsyncThunk(
  'auth/verifyTwoFactorSetup',
  async ({ token }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/verify-2fa-setup', { token });
      toast.success('Two-factor authentication enabled successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || '2FA verification failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Disable 2FA
export const disableTwoFactor = createAsyncThunk(
  'auth/disableTwoFactor',
  async ({ password }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/disable-2fa', { password });
      toast.success('Two-factor authentication disabled');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to disable 2FA';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Forgot password
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      toast.success('Password reset link sent to your email');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset link';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Reset password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/reset-password', {
        token,
        password,
      });
      toast.success('Password reset successful! Please login.');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Update profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      toast.success('Profile updated successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearTwoFactorRequired: (state) => {
      state.twoFactorRequired = false;
    },
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1;
      if (state.loginAttempts >= 5) {
        state.accountLocked = true;
        state.lockoutTime = Date.now() + 30 * 60 * 1000; // 30 minutes
      }
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
      state.accountLocked = false;
      state.lockoutTime = null;
    },
    checkLockoutExpiry: (state) => {
      if (state.lockoutTime && Date.now() > state.lockoutTime) {
        state.accountLocked = false;
        state.lockoutTime = null;
        state.loginAttempts = 0;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.twoFactorRequired) {
          state.twoFactorRequired = true;
        } else {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.twoFactorRequired = false;
          state.loginAttempts = 0;
          state.accountLocked = false;
          state.lockoutTime = null;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.loginAttempts += 1;
        if (state.loginAttempts >= 5) {
          state.accountLocked = true;
          state.lockoutTime = Date.now() + 30 * 60 * 1000;
        }
      })

      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.twoFactorRequired = false;
        state.error = null;
      })

      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      })

      // Enable 2FA
      .addCase(enableTwoFactor.fulfilled, (state, action) => {
        state.user = { ...state.user, twoFactorEnabled: false }; // Will be true after verification
      })

      // Verify 2FA setup
      .addCase(verifyTwoFactorSetup.fulfilled, (state) => {
        state.user = { ...state.user, twoFactorEnabled: true };
      })

      // Disable 2FA
      .addCase(disableTwoFactor.fulfilled, (state) => {
        state.user = { ...state.user, twoFactorEnabled: false };
      })

      // Handle all rejected cases
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      )

      // Handle all pending cases
      .addMatcher(
        (action) => action.type.endsWith('/pending'),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      );
  },
});

export const {
  clearError,
  clearTwoFactorRequired,
  incrementLoginAttempts,
  resetLoginAttempts,
  checkLockoutExpiry,
} = authSlice.actions;

export default authSlice.reducer;