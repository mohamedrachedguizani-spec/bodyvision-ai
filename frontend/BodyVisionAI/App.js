// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import LoadingSpinner from './src/components/LoadingSpinner';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HelpScreen from './src/screens/HelpScreen';
import TermsScreen from './src/screens/TermsScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, isLoading, isInitialized } = useAuth();
  const { isDarkMode } = useTheme();

  // Afficher un écran de chargement pendant l'initialisation
  if (isLoading && !isInitialized) {
    return <LoadingSpinner message="Chargement de l'application..." />;
  }

  console.log('🔄 AppNavigator state:', {
    user: user ? `Logged in as ${user.email}` : 'No user',
    isLoading,
    isInitialized
  });

  return (
    <Stack.Navigator screenOptions={{
      headerStyle: {
        backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      },
      headerTintColor: isDarkMode ? '#FFFFFF' : '#000000',
    }}>
      {!user ? (
        // Routes pour utilisateurs non connectés
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ 
              title: 'Créer un compte',
              headerBackTitle: 'Connexion'
            }}
          />
        </>
      ) : (
        // Routes pour utilisateurs connectés
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen}
            options={{ title: 'Analyse Corporelle' }}
          />
          <Stack.Screen 
            name="Analysis" 
            component={AnalysisScreen}
            options={{ title: 'Résultats d\'Analyse' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'Profil' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ title: 'Paramètres' }}
          />
          <Stack.Screen 
            name="Help" 
            component={HelpScreen}
            options={{ title: 'Centre d\'aide' }}
          />
          <Stack.Screen 
            name="Terms" 
            component={TermsScreen}
            options={{ title: 'Conditions d\'utilisation' }}
          />
          <Stack.Screen 
            name="Privacy" 
            component={PrivacyScreen}
            options={{ title: 'Politique de confidentialité' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}