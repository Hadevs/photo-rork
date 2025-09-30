import appsFlyer from 'react-native-appsflyer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export interface ConversionData {
  campaign?: string;
  af_status?: string;
  is_first_launch?: string;
  media_source?: string;
  [key: string]: any;
}

export interface UrlParameters {
  inapp: string;
  appsflyer: string;
  sub5: string;
}

class AppsFlyerService {
  private static instance: AppsFlyerService;
  private readonly DEV_KEY = '9mbALiWmN3xhVWp3uEqnom';
  private readonly STORAGE_KEY = 'appsflyer_data';
  private isInitialized = false;

  public static getInstance(): AppsFlyerService {
    if (!AppsFlyerService.instance) {
      AppsFlyerService.instance = new AppsFlyerService();
    }
    return AppsFlyerService.instance;
  }

  private constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Инициализация AppsFlyer
      appsFlyer.initSdk({
        devKey: this.DEV_KEY,
        isDebug: __DEV__,
        appId: Platform.OS === 'ios' ? 'YOUR_IOS_APP_ID' : undefined, // Не нужно для Android
        onInstallConversionDataListener: true,
        onDeepLinkListener: true,
        timeToWaitForATTUserAuthorization: 10,
      });

      this.isInitialized = true;
      console.log('AppsFlyer initialized successfully');
    } catch (error) {
      console.error('AppsFlyer initialization failed:', error);
      throw error;
    }
  }

  async getConversionData(): Promise<string | null> {
    return new Promise((resolve) => {
      const unsubscribe = appsFlyer.onInstallConversionData((data: ConversionData) => {
        console.log('AppsFlyer conversion data received:', data);
        
        try {
          // Проверяем, является ли пользователь органическим
          const isOrganic = data.af_status === 'Organic' || !data.af_status;
          
          if (isOrganic) {
            console.log('User is organic');
            this.markAsOrganic();
            resolve(null);
            return;
          }

          // Получаем campaign (должна быть в base64)
          const campaign = data.campaign;
          if (!campaign) {
            console.warn('Campaign not found in conversion data');
            this.markAsOrganic();
            resolve(null);
            return;
          }

          console.log('Campaign received:', campaign);
          
          // Обрабатываем campaign и строим финальную ссылку
          this.processCampaign(campaign)
            .then((finalUrl) => {
              if (finalUrl) {
                this.saveUrl(finalUrl);
                resolve(finalUrl);
              } else {
                this.markAsOrganic();
                resolve(null);
              }
            })
            .catch((error) => {
              console.error('Error processing campaign:', error);
              this.markAsOrganic();
              resolve(null);
            });

        } catch (error) {
          console.error('Error handling conversion data:', error);
          this.markAsOrganic();
          resolve(null);
        }
      });

      // Таймаут на случай, если данные не приходят
      // setTimeout(() => {
      //   unsubscribe();
      //   console.log('AppsFlyer conversion data timeout');
      //   this.markAsOrganic();
      //   resolve(null);
      // }, 10000); // 10 секунд
    });
  }

  private async processCampaign(base64Campaign: string): Promise<string | null> {
    try {
      // Декодируем base64
      const decodedUrl = this.decodeBase64(base64Campaign);
      console.log('Decoded URL:', decodedUrl);

      // Получаем параметры для добавления к URL
      const params = await this.getUrlParameters();
      if (!params) {
        console.error('Failed to get URL parameters');
        return null;
      }

      // Строим финальную ссылку
      const finalUrl = this.buildUrlWithParams(decodedUrl, params);
      console.log('Final URL:', finalUrl);

      return finalUrl;
    } catch (error) {
      console.error('Error processing campaign:', error);
      return null;
    }
  }

  private decodeBase64(base64String: string): string {
    try {
      // В React Native используем встроенный atob
      const decoded = atob(base64String);
      return decoded;
    } catch (error) {
      console.error('Base64 decode error:', error);
      throw new Error('Failed to decode base64 string');
    }
  }
  private async getUrlParameters(): Promise<UrlParameters | null> {
    try {
      // Получаем package name
      const packageName = Application.applicationId || 'app.rork.mobile.camera.app.filters';

      // Получаем AppsFlyer UID
      return new Promise((resolve) => {
        appsFlyer.getAppsFlyerUID(async (error, appsFlyerUID) => {
          if (error) {
            console.error('Failed to get AppsFlyer UID:', error);
            resolve(null);
            return;
          }

          if (!appsFlyerUID) {
            console.error('AppsFlyer UID is null');
            resolve(null);
            return;
          }

          // Получаем Advertising ID (для Android)
          let advertisingId: string;
          if (Platform.OS === 'android') {
            try {
              // В production приложении здесь нужно будет использовать 
              // react-native-device-info или аналогичную библиотеку
              advertisingId = await this.getAndroidAdvertisingId();
            } catch (error) {
              console.warn('Failed to get advertising ID, using fallback');
              advertisingId = 'fallback-id';
            }
          } else {
            advertisingId = 'ios-fallback-id';
          }

          resolve({
            inapp: packageName,
            appsflyer: appsFlyerUID,
            sub5: advertisingId
          });
        });
      });
    } catch (error) {
      console.error('Error getting URL parameters:', error);
      return null;
    }
  }

  private async getAndroidAdvertisingId(): Promise<string> {
    // Для получения Advertising ID нужна дополнительная библиотека
    // Пока используем fallback
    return 'android-advertising-id-placeholder';
  }

  private buildUrlWithParams(baseUrl: string, params: UrlParameters): string {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const encodedParams = [
      `inapp=${encodeURIComponent(params.inapp)}`,
      `appsflyer=${encodeURIComponent(params.appsflyer)}`,
      `sub5=${encodeURIComponent(params.sub5)}`
    ].join('&');

    return `${baseUrl}${separator}${encodedParams}`;
  }

  async getSavedUrl(): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.url || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting saved URL:', error);
      return null;
    }
  }

  private async saveUrl(url: string): Promise<void> {
    try {
      const data = {
        url,
        isOrganic: false,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('URL saved successfully:', url);
    } catch (error) {
      console.error('Error saving URL:', error);
    }
  }

  private async markAsOrganic(): Promise<void> {
    try {
      const data = {
        url: null,
        isOrganic: true,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('User marked as organic');
    } catch (error) {
      console.error('Error marking as organic:', error);
    }
  }

  async isOrganic(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.isOrganic === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking organic status:', error);
      return false;
    }
  }

  async hasSavedUrl(): Promise<boolean> {
    const url = await this.getSavedUrl();
    return url !== null;
  }

  async clearData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('AppsFlyer data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

export default AppsFlyerService;
