import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Settings,
  Grid3X3,
  X,
  Focus
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PhotoEditorScreen from './PhotoEditorScreen';
import AppsFlyerService from '../services/AppsFlyerService';
import { facebookService } from '../services/FacebookService';
import WebViewScreen from '../components/WebViewScreen';



type CameraMode = 'photo' | 'pro' | 'panorama';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [mode, setMode] = useState<CameraMode>('photo');
  const [showGrid, setShowGrid] = useState(false);
  const [showGoldenRatio, setShowGoldenRatio] = useState(false);
  const [showPro, setShowPro] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Photo editor state
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  
  // Gallery state
  const [recentPhoto, setRecentPhoto] = useState<string | null>(null);
  
  // AppsFlyer state
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [isLoadingAppsFlyer, setIsLoadingAppsFlyer] = useState(true);
  
  // Pro camera settings
  const [selectedProSetting, setSelectedProSetting] = useState<string>('F');
  const [exposureValue, setExposureValue] = useState(0.17);
  const [isoValue, setIsoValue] = useState(320);
  const [shutterSpeed, setShutterSpeed] = useState('1/120');
  const [apertureValue, setApertureValue] = useState(0.20);
  const [whiteBalance, setWhiteBalance] = useState('8600K');
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!mediaPermission?.granted) {
      requestMediaPermission();
    }
  }, [mediaPermission, requestMediaPermission]);

  // AppsFlyer and Facebook SDK initialization
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize Facebook SDK first
        console.log('Initializing Facebook SDK...');
        await facebookService.initialize();
        
        // Initialize AppsFlyer
        const appsFlyerService = AppsFlyerService.getInstance();
        
        // Инициализируем AppsFlyer
        await appsFlyerService.initialize();
        
        // Проверяем, есть ли сохраненная ссылка
        if (await appsFlyerService.hasSavedUrl()) {
          const savedUrl = await appsFlyerService.getSavedUrl();
          if (savedUrl) {
            console.log('Found saved URL, opening WebView:', savedUrl);
            setWebViewUrl(savedUrl);
            setShowWebView(true);
            setIsLoadingAppsFlyer(false);
            return;
          }
        }
        
        // Проверяем, является ли пользователь органическим
        if (await appsFlyerService.isOrganic()) {
          console.log('User is organic, staying in native app');
          setIsLoadingAppsFlyer(false);
          return;
        }
        
        // Получаем данные конверсии от AppsFlyer
        console.log('Getting conversion data from AppsFlyer...');
        const url = await appsFlyerService.getConversionData();
        
        if (url) {
          console.log('Received URL from AppsFlyer, opening WebView:', url);
          setWebViewUrl(url);
          setShowWebView(true);
        } else {
          console.log('No URL received or user is organic, staying in native app');
        }
        
      } catch (error) {
        console.error('Services initialization error:', error);
      } finally {
        setIsLoadingAppsFlyer(false);
      }
    };

    initializeServices();
  }, []);

  // Load recent photo for gallery preview
  useEffect(() => {
    const loadRecentPhoto = async () => {
      if (mediaPermission?.granted) {
        try {
          const assets = await MediaLibrary.getAssetsAsync({
            first: 1,
            mediaType: 'photo',
            sortBy: 'creationTime'
          });
          
          if (assets.assets.length > 0) {
            const asset = assets.assets[0];
            console.log('Recent photo asset:', asset);
            
            // Get asset info with local URI to avoid ph:// schema issues
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
            console.log('Asset info:', assetInfo);
            
            if (assetInfo.localUri) {
              console.log('Recent photo loaded with local URI:', assetInfo.localUri);
              setRecentPhoto(assetInfo.localUri);
            } else {
              console.log('Recent photo loaded with original URI:', asset.uri);
              setRecentPhoto(asset.uri);
            }
          }
        } catch (error) {
          console.error('Error loading recent photo:', error);
        }
      }
    };

    loadRecentPhoto();
  }, [mediaPermission?.granted]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need camera permission</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => {
      const newFacing = current === 'back' ? 'front' : 'back';
      console.log('Switching camera from', current, 'to', newFacing);
      return newFacing;
    });
  };

  const toggleFlash = () => {
    setFlash(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  // Gallery handlers
  const openGallery = async () => {
    try {
      console.log('Opening gallery...');
      
      if (!mediaPermission?.granted) {
        Alert.alert('Permission Required', 'Please grant media library permission to view photos');
        return;
      }

      // Request gallery permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library');
        return;
      }

      // Launch image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      console.log('Gallery result:', result);

      if (!result.canceled && result.assets.length > 0) {
        const selectedPhoto = result.assets[0];
        console.log('Photo selected from gallery:', selectedPhoto.uri);
        
        // Open the selected photo in photo editor
        setCapturedPhotoUri(selectedPhoto.uri);
        setShowPhotoEditor(true);
      }
    } catch (error) {
      console.error('Error opening gallery:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  // Photo editor handlers
  const handlePhotoEditorBack = () => {
    setShowPhotoEditor(false);
    setCapturedPhotoUri(null);
  };

  const handlePhotoEditorSave = async (editedPhotoUri?: string) => {
    try {
      const photoUriToSave = editedPhotoUri || capturedPhotoUri;
      
      console.log('Saving photo to gallery...');
      console.log('Photo URI to save:', photoUriToSave);
      console.log('Media permission granted:', mediaPermission?.granted);
      
      if (photoUriToSave && mediaPermission?.granted) {
        // Check if file exists before saving
        const fileInfo = await FileSystem.getInfoAsync(photoUriToSave);
        console.log('File info:', fileInfo);
        
        if (fileInfo.exists) {
          const asset = await MediaLibrary.createAssetAsync(photoUriToSave);
          console.log('Photo saved to gallery successfully:', asset);
          
          // Update gallery preview with the newly saved photo using local URI
          try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
            const previewUri = assetInfo.localUri || asset.uri;
            console.log('Updating gallery preview with:', previewUri);
            setRecentPhoto(previewUri);
          } catch (error) {
            console.error('Error getting asset info for preview:', error);
            // Fallback to original URI if getting asset info fails
            setRecentPhoto(asset.uri);
          }
          
          Alert.alert('Success', 'Photo saved to gallery!');
        } else {
          console.error('File does not exist at URI:', photoUriToSave);
          Alert.alert('Error', 'Generated image file not found');
        }
      } else if (!mediaPermission?.granted) {
        Alert.alert('Permission Required', 'Please grant media library permission to save photos');
      } else {
        console.error('No photo URI provided');
        Alert.alert('Error', 'No photo to save');
      }
      
      // Close editor and reset state
      setShowPhotoEditor(false);
      setCapturedPhotoUri(null);
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo to gallery');
    }
  };

  // Pro setting handlers
  const handleProSettingTap = (setting: string) => {
    setSelectedProSetting(setting);
    console.log('Selected pro setting:', setting);
  };

  const cycleProValue = (setting: string) => {
    switch (setting) {
      case 'EV':
        setExposureValue(prev => {
          const values = [-2, -1, 0, 0.17, 1, 2];
          const currentIndex = values.findIndex(val => Math.abs(val - prev) < 0.1);
          const nextIndex = (currentIndex + 1) % values.length;
          return values[nextIndex];
        });
        break;
      case 'ISO':
        setIsoValue(prev => {
          const values = [50, 100, 200, 320, 400, 800, 1600];
          const currentIndex = values.indexOf(prev);
          const nextIndex = (currentIndex + 1) % values.length;
          return values[nextIndex];
        });
        break;
      case 'S':
        setShutterSpeed(prev => {
          const values = ['1/30', '1/60', '1/120', '1/240', '1/500'];
          const currentIndex = values.indexOf(prev);
          const nextIndex = (currentIndex + 1) % values.length;
          return values[nextIndex];
        });
        break;
      case 'F':
        setApertureValue(prev => {
          const values = [0.20, 0.95, 1.4, 2.0, 2.8, 4.0];
          const currentIndex = values.findIndex(val => Math.abs(val - prev) < 0.1);
          const nextIndex = (currentIndex + 1) % values.length;
          return values[nextIndex];
        });
        break;
      case 'WB':
        setWhiteBalance(prev => {
          const values = ['2700K', '3200K', '5600K', '8600K', 'Auto'];
          const currentIndex = values.indexOf(prev);
          const nextIndex = (currentIndex + 1) % values.length;
          return values[nextIndex];
        });
        break;
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) {
      console.log('Camera not ready or already capturing');
      return;
    }

    try {
      setIsCapturing(true);
      
      console.log('Taking photo...');
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
          exif: true
        });
        
        console.log('Photo taken:', photo);
        
        if (photo && photo.uri) {
          // Open photo editor instead of immediately saving
          setCapturedPhotoUri(photo.uri);
          setShowPhotoEditor(true);
        } else {
          Alert.alert('Error', 'Failed to capture photo');
        }
    } catch (error) {
      console.error('Error in takePicture:', error);
      Alert.alert('Error', 'Failed to capture media. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };


  const renderTopControls = () => (
    <View style={[styles.topControls, { paddingTop: insets.top + 10 }]}>
      <View style={styles.topLeft}>
        <TouchableOpacity 
          style={[styles.controlButton, flash !== 'off' && styles.controlButtonActive]}
          onPress={toggleFlash}
        >
          {flash === 'off' ? <ZapOff color="white" size={20} /> : <Zap color="white" size={20} />}
        </TouchableOpacity>
        
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityText}>4K</Text>
        </View>
        
        {facing === 'back' && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>RAW</Text>
          </View>
        )}
      </View>

      <View style={styles.topRight}>
        <TouchableOpacity 
          style={[styles.controlButton, showGrid && styles.controlButtonActive]}
          onPress={() => {
            const newShowGrid = !showGrid;
            console.log('Toggling regular grid:', showGrid, '->', newShowGrid);
            setShowGrid(newShowGrid);
            if (newShowGrid) setShowGoldenRatio(false); // Turn off golden ratio when enabling regular grid
          }}
        >
          <Grid3X3 color="white" size={20} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, showGoldenRatio && styles.controlButtonActive]}
          onPress={() => {
            const newShowGoldenRatio = !showGoldenRatio;
            console.log('Toggling golden ratio grid:', showGoldenRatio, '->', newShowGoldenRatio);
            setShowGoldenRatio(newShowGoldenRatio);
            if (newShowGoldenRatio) setShowGrid(false); // Turn off regular grid when enabling golden ratio
          }}
        >
          <Focus color="white" size={20} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, showPro && styles.controlButtonActive]}
          onPress={() => {
            const newShowPro = !showPro;
            console.log('Toggling pro controls:', newShowPro ? 'opening' : 'closing');
            setShowPro(newShowPro);
          }}
        >
          {showPro ? <X color="white" size={20} /> : <Settings color="white" size={20} />}
        </TouchableOpacity>

      </View>
    </View>
  );

  const renderProControls = () => {
    if (!showPro) return null;
    
    const proSettings = [
      { key: 'EV', label: 'EV', value: exposureValue.toString() },
      { key: 'ISO', label: 'ISO', value: isoValue.toString() },
      { key: 'S', label: 'S', value: shutterSpeed },
      { key: 'F', label: 'F', value: apertureValue.toFixed(2) },
      { key: 'WB', label: 'WB', value: whiteBalance }
    ];
    
    return (
      <View style={styles.proControls}>
        {proSettings.map((setting) => (
          <TouchableOpacity
            key={setting.key}
            style={[
              styles.proControl,
              selectedProSetting === setting.key && styles.proControlActive
            ]}
            onPress={() => {
              handleProSettingTap(setting.key);
              cycleProValue(setting.key);
            }}
          >
            <Text style={styles.proLabel}>{setting.label}</Text>
            <Text style={styles.proValue}>{setting.value}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      {(['photo', 'pro', 'panorama'] as CameraMode[]).map((modeOption) => (
        <TouchableOpacity
          key={modeOption}
          style={[styles.modeButton, mode === modeOption && styles.modeButtonActive]}
          onPress={() => {
            setMode(modeOption);
            // Auto-open pro controls when selecting pro mode
            if (modeOption === 'pro') {
              setShowPro(true);
            }
          }}
        >
          <Text style={[styles.modeText, mode === modeOption && styles.modeTextActive]}>
            {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBottomControls = () => (
    <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
      {renderModeSelector()}
      
      <View style={styles.captureControls}>
        <TouchableOpacity style={styles.galleryButton} onPress={openGallery}>
          <View style={styles.galleryPreview}>
            {recentPhoto && !recentPhoto.startsWith('ph://') && (
              <Image 
                source={{ uri: recentPhoto }} 
                style={styles.galleryPreviewImage}
                resizeMode="cover"
                onError={(error) => {
                  console.warn('Gallery preview image load error:', error);
                }}
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
          <RotateCcw color="white" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGrid = () => {
    if (!showGrid) return null;
    
    return (
      <View style={styles.gridOverlay}>
        <View style={[styles.gridLine, styles.gridLineVertical, { left: '33.33%' }]} />
        <View style={[styles.gridLine, styles.gridLineVertical, { left: '66.66%' }]} />
        <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '33.33%' }]} />
        <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '66.66%' }]} />
      </View>
    );
  };

  const renderGoldenRatioGrid = () => {
    if (!showGoldenRatio) return null;
    
    // Golden ratio ≈ 1.618
    // For golden ratio grid, we use 61.8% and 38.2% divisions
    return (
      <View style={styles.gridOverlay}>
        {/* Vertical golden ratio lines */}
        <View style={[styles.gridLine, styles.gridLineVertical, styles.goldenRatioLine, { left: '38.2%' }]} />
        <View style={[styles.gridLine, styles.gridLineVertical, styles.goldenRatioLine, { left: '61.8%' }]} />
        
        {/* Horizontal golden ratio lines */}
        <View style={[styles.gridLine, styles.gridLineHorizontal, styles.goldenRatioLine, { top: '38.2%' }]} />
        <View style={[styles.gridLine, styles.gridLineHorizontal, styles.goldenRatioLine, { top: '61.8%' }]} />
        
        {/* Golden ratio spirals (corners) */}
        <View style={[styles.goldenSpiral, styles.goldenSpiralTopLeft]} />
        <View style={[styles.goldenSpiral, styles.goldenSpiralTopRight]} />
        <View style={[styles.goldenSpiral, styles.goldenSpiralBottomLeft]} />
        <View style={[styles.goldenSpiral, styles.goldenSpiralBottomRight]} />
      </View>
    );
  };

  // Show loading screen while AppsFlyer is initializing
  if (isLoadingAppsFlyer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show WebView if URL is available
  if (showWebView && webViewUrl) {
    return <WebViewScreen url={webViewUrl} />;
  }

  // Render photo editor if active
  if (showPhotoEditor && capturedPhotoUri) {
    return (
      <PhotoEditorScreen
        photoUri={capturedPhotoUri}
        onBack={handlePhotoEditorBack}
        onSave={handlePhotoEditorSave}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        mode="picture"
      >
        {renderGrid()}
        {renderGoldenRatioGrid()}
        {renderTopControls()}
        {renderProControls()}
        {renderBottomControls()}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  qualityBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qualityText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
  },
  proControls: {
    position: 'absolute',
    bottom: 280,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  proControl: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  proControlActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  proLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  proValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 20,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  modeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  modeTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  captureControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryPreview: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryPreviewImage: {
    width: '100%',
    height: '100%',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonRecording: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  captureButtonInnerRecording: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    width: 40,
    height: 40,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  gridLineHorizontal: {
    height: 1,
    width: '100%',
  },
  goldenRatioLine: {
    backgroundColor: 'rgba(255, 215, 0, 0.4)', // Golden color with transparency
  },
  goldenSpiral: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'rgba(255, 215, 0, 0.6)',
    borderWidth: 2,
  },
  goldenSpiralTopLeft: {
    top: '38.2%',
    left: '38.2%',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 30,
  },
  goldenSpiralTopRight: {
    top: '38.2%',
    right: '38.2%',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 30,
  },
  goldenSpiralBottomLeft: {
    bottom: '38.2%',
    left: '38.2%',
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 30,
  },
  goldenSpiralBottomRight: {
    bottom: '38.2%',
    right: '38.2%',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
  },
});