import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { LoginManager, LoginResult, AccessToken, Profile } from 'react-native-fbsdk-next';
import { facebookService } from '../services/FacebookService';

interface FacebookLoginProps {
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: any) => void;
  buttonText?: string;
  style?: any;
}

const FacebookLogin: React.FC<FacebookLoginProps> = ({
  onLoginSuccess,
  onLoginError,
  buttonText = 'Login with Facebook',
  style
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  React.useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const accessToken = await facebookService.getCurrentAccessToken();
      if (accessToken) {
        const profile = await facebookService.getCurrentProfile();
        setIsLoggedIn(true);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);

      // Check if SDK is initialized
      if (!facebookService.isSDKInitialized()) {
        await facebookService.initialize();
      }

      // Perform login
      const result: LoginResult = await LoginManager.logInWithPermissions([
        'public_profile',
        'email'
      ]);

      if (result.isCancelled) {
        console.log('Facebook login cancelled');
        return;
      }

      if (result.grantedPermissions) {
        console.log('Facebook login successful');
        
        // Get access token
        const accessToken = await AccessToken.getCurrentAccessToken();
        
        if (accessToken) {
          console.log('Access token obtained:', accessToken.accessToken);
          
          // Get user profile
          const profile = await Profile.getCurrentProfile();
          
          if (profile) {
            console.log('User profile:', profile);
            setIsLoggedIn(true);
            setUserProfile(profile);
            
            if (onLoginSuccess) {
              onLoginSuccess({
                accessToken: accessToken.accessToken,
                profile: profile
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      
      if (onLoginError) {
        onLoginError(error);
      } else {
        Alert.alert('Login Error', 'Failed to login with Facebook');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await LoginManager.logOut();
      setIsLoggedIn(false);
      setUserProfile(null);
      console.log('Facebook logout successful');
    } catch (error) {
      console.error('Facebook logout error:', error);
      Alert.alert('Logout Error', 'Failed to logout from Facebook');
    }
  };

  if (isLoggedIn && userProfile) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.welcomeText}>
          Welcome, {userProfile.firstName || userProfile.name}!
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.loginButton, style]} 
      onPress={handleLogin}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.loginButtonText}>{buttonText}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  loginButton: {
    backgroundColor: '#1877F2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
  },
  welcomeText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
});

export default FacebookLogin;
