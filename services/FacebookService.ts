import { Settings, Profile, AccessToken } from 'react-native-fbsdk-next';

// Facebook App Configuration
const FACEBOOK_APP_ID = '1163204159036501';
const FACEBOOK_CLIENT_TOKEN = '0a68eaabc48a06f13a3dbb1e8ec5dc6f';

class FacebookService {
  private isInitialized = false;

  /**
   * Initialize Facebook SDK
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.log('Facebook SDK already initialized');
        return;
      }

      // Set Facebook app ID and client token
      Settings.setAppID(FACEBOOK_APP_ID);
      Settings.setClientToken(FACEBOOK_CLIENT_TOKEN);
      
      // Initialize Facebook SDK
      await Settings.initializeSDK();
      
      this.isInitialized = true;
      console.log('Facebook SDK initialized successfully');
      
      // Check if user is already logged in
      const accessToken = await AccessToken.getCurrentAccessToken();
      if (accessToken) {
        console.log('User is already logged in to Facebook');
        const profile = await Profile.getCurrentProfile();
        if (profile) {
          console.log('Current user profile:', profile);
        }
      }
    } catch (error) {
      console.error('Failed to initialize Facebook SDK:', error);
      throw error;
    }
  }

  /**
   * Check if SDK is initialized
   */
  isSDKInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current access token
   */
  async getCurrentAccessToken(): Promise<any> {
    try {
      return await AccessToken.getCurrentAccessToken();
    } catch (error) {
      console.error('Error getting current access token:', error);
      return null;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentProfile(): Promise<any> {
    try {
      return await Profile.getCurrentProfile();
    } catch (error) {
      console.error('Error getting current profile:', error);
      return null;
    }
  }

  /**
   * Get Facebook App ID
   */
  getAppID(): string {
    return FACEBOOK_APP_ID;
  }

  /**
   * Get Facebook Client Token
   */
  getClientToken(): string {
    return FACEBOOK_CLIENT_TOKEN;
  }
}

// Export singleton instance
export const facebookService = new FacebookService();
export default FacebookService;
