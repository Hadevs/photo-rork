import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';

interface WebViewScreenProps {
  url: string;
}

export default function WebViewScreen({ url }: WebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Обработка кнопки "Назад"
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        // Не позволяем закрыть WebView согласно требованиям
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [canGoBack])
  );

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url: requestUrl } = request;
    
    // Обработка SMS интентов
    if (requestUrl.startsWith('sms:') || requestUrl.startsWith('smsto:')) {
      // В React Native нужно использовать Linking
      import('expo-linking').then((Linking) => {
        Linking.openURL(requestUrl).catch((error) => {
          console.error('Failed to open SMS:', error);
          Alert.alert('Ошибка', 'Не удалось открыть SMS');
        });
      });
      return false;
    }

    // Обработка телефонных звонков
    if (requestUrl.startsWith('tel:')) {
      import('expo-linking').then((Linking) => {
        Linking.openURL(requestUrl).catch((error) => {
          console.error('Failed to open phone:', error);
          Alert.alert('Ошибка', 'Не удалось совершить звонок');
        });
      });
      return false;
    }

    return true;
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert('Ошибка загрузки', 'Не удалось загрузить страницу');
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView HTTP error:', nativeEvent);
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        allowsLinkPreview={false}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleError}
        onHttpError={handleHttpError}
        userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 AppWebView/1.0"
        // Поддержка загрузки файлов
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Дополнительные настройки для Android
        onFileDownload={({ nativeEvent }) => {
          console.log('File download requested:', nativeEvent.downloadUrl);
          // Здесь можно добавить логику загрузки файлов
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
});
