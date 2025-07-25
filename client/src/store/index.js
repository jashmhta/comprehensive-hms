import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Slices
import authSlice from './slices/authSlice';
import patientSlice from './slices/patientSlice';
import opdSlice from './slices/opdSlice';
import ipdSlice from './slices/ipdSlice';
import pharmacySlice from './slices/pharmacySlice';
import labSlice from './slices/labSlice';
import radiologySlice from './slices/radiologySlice';
import billingSlice from './slices/billingSlice';
import emergencySlice from './slices/emergencySlice';
import bloodBankSlice from './slices/bloodBankSlice';
import otSlice from './slices/otSlice';
import ambulanceSlice from './slices/ambulanceSlice';
import hrSlice from './slices/hrSlice';
import analyticsSlice from './slices/analyticsSlice';
import notificationSlice from './slices/notificationSlice';
import socketSlice from './slices/socketSlice';
import uiSlice from './slices/uiSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
  blacklist: ['socket', 'notifications'] // Don't persist real-time data
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  patient: patientSlice,
  opd: opdSlice,
  ipd: ipdSlice,
  pharmacy: pharmacySlice,
  lab: labSlice,
  radiology: radiologySlice,
  billing: billingSlice,
  emergency: emergencySlice,
  bloodBank: bloodBankSlice,
  ot: otSlice,
  ambulance: ambulanceSlice,
  hr: hrSlice,
  analytics: analyticsSlice,
  notifications: notificationSlice,
  socket: socketSlice,
  ui: uiSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'socket/connect',
          'socket/disconnect',
          'socket/message'
        ],
        ignoredPaths: ['socket.connection']
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;