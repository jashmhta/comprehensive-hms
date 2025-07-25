import React, { useEffect } from 'react';
import { StatusBar, Platform, PermissionsAndroid } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Toast from 'react-native-toast-message';
import SplashScreen from 'react-native-splash-screen';
import { enableScreens } from 'react-native-screens';
import messaging from '@react-native-firebase/messaging';

// Redux Store
import { store, persistor } from './src/store';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Components
import LoadingScreen from './src/components/common/LoadingScreen';
import ErrorBoundary from './src/components/common/ErrorBoundary';

// Theme
import { theme } from './src/theme';

// Utils
import { requestUserPermission, notificationListener } from './src/utils/notificationService';

// Enable screens for better performance
enableScreens();

const App = () => {
  useEffect(() => {
    // Hide splash screen after app loads
    const timer = setTimeout(() => {
      SplashScreen.hide();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Request notification permissions
    requestUserPermission();
    
    // Set up notification listeners
    notificationListener();

    // Request camera and storage permissions for Android
    if (Platform.OS === 'android') {
      requestAndroidPermissions();
    }
  }, []);

  const requestAndroidPermissions = async () => {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      console.log('Permissions granted:', granted);
    } catch (error) {
      console.warn('Permission request error:', error);
    }
  };

  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <PaperProvider theme={theme}>
            <NavigationContainer theme={theme}>
              <StatusBar
                barStyle="light-content"
                backgroundColor={theme.colors.primary}
                translucent={false}
              />
              <AppNavigator />
              <Toast />
            </NavigationContainer>
          </PaperProvider>
        </PersistGate>
      </ReduxProvider>
    </ErrorBoundary>
  );
};

export default App;