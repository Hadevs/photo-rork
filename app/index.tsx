import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar,
  Alert
} from 'react-native';
import { 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Settings,
  Grid3X3
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



type CameraMode = 'photo' | 'video' | 'pro' | 'panorama';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<CameraMode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showPro, setShowPro] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!mediaPermission?.granted) {
      requestMediaPermission();
    }
  }, [mediaPermission, requestMediaPermission]);

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
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) {
      console.log('Camera not ready or already capturing');
      return;
    }

    try {
      setIsCapturing(true);
      
      if (mode === 'video') {
        if (isRecording) {
          console.log('Stopping video recording...');
          cameraRef.current.stopRecording();
          setIsRecording(false);
        } else {
          console.log('Starting video recording...');
          setIsRecording(true);
          
          const video = await cameraRef.current.recordAsync({
            maxDuration: 60
          });
          
          console.log('Video recorded:', video);
          
          if (video && video.uri && mediaPermission?.granted) {
            try {
              const asset = await MediaLibrary.createAssetAsync(video.uri);
              console.log('Video saved to gallery:', asset);
              Alert.alert('Success', 'Video saved to gallery!');
            } catch (saveError) {
              console.error('Error saving video to gallery:', saveError);
              Alert.alert('Error', 'Failed to save video to gallery');
            }
          }
          
          setIsRecording(false);
        }
      } else {
        console.log('Taking photo...');
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
          exif: true
        });
        
        console.log('Photo taken:', photo);
        
        if (photo && photo.uri && mediaPermission?.granted) {
          try {
            const asset = await MediaLibrary.createAssetAsync(photo.uri);
            console.log('Photo saved to gallery:', asset);
            Alert.alert('Success', 'Photo saved to gallery!');
          } catch (saveError) {
            console.error('Error saving photo to gallery:', saveError);
            Alert.alert('Error', 'Failed to save photo to gallery');
          }
        } else if (!mediaPermission?.granted) {
          Alert.alert('Permission Required', 'Please grant media library permission to save photos and videos');
        }
      }
    } catch (error) {
      console.error('Error in takePicture:', error);
      Alert.alert('Error', 'Failed to capture media. Please try again.');
      setIsRecording(false);
    } finally {
      setIsCapturing(false);
    }
  };

  const zoomLevels = [1, 2, 3, 5, 10];
  const currentZoomIndex = zoomLevels.findIndex(level => level === zoom);

  const handleZoomTap = () => {
    try {
      const nextIndex = (currentZoomIndex + 1) % zoomLevels.length;
      const newZoom = zoomLevels[nextIndex];
      console.log('Changing zoom to:', newZoom);
      setZoom(newZoom);
    } catch (error) {
      console.error('Error changing zoom:', error);
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
          onPress={() => setShowGrid(!showGrid)}
        >
          <Grid3X3 color="white" size={20} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowPro(!showPro)}
        >
          <Settings color="white" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomTap}>
          <Text style={styles.zoomText}>{zoom}X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProControls = () => {
    if (!showPro) return null;
    
    return (
      <View style={styles.proControls}>
        <View style={styles.proControl}>
          <Text style={styles.proLabel}>EV</Text>
          <Text style={styles.proValue}>0.17</Text>
        </View>
        <View style={styles.proControl}>
          <Text style={styles.proLabel}>ISO</Text>
          <Text style={styles.proValue}>320</Text>
        </View>
        <View style={styles.proControl}>
          <Text style={styles.proLabel}>S</Text>
          <Text style={styles.proValue}>1/120</Text>
        </View>
        <View style={[styles.proControl, styles.proControlActive]}>
          <Text style={styles.proLabel}>F</Text>
          <Text style={styles.proValue}>0.20</Text>
        </View>
        <View style={styles.proControl}>
          <Text style={styles.proLabel}>WB</Text>
          <Text style={styles.proValue}>8600K</Text>
        </View>
      </View>
    );
  };

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      {(['photo', 'video', 'pro', 'panorama'] as CameraMode[]).map((modeOption) => (
        <TouchableOpacity
          key={modeOption}
          style={[styles.modeButton, mode === modeOption && styles.modeButtonActive]}
          onPress={() => setMode(modeOption)}
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
        <TouchableOpacity style={styles.galleryButton}>
          <View style={styles.galleryPreview} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.captureButton, isRecording && styles.captureButtonRecording, isCapturing && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={isCapturing}
        >
          <View style={[styles.captureButtonInner, isRecording && styles.captureButtonInnerRecording]} />
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        zoom={Math.max(1, Math.min(zoom, 10))}
        mode={mode === 'video' ? 'video' : 'picture'}
      >
        {renderGrid()}
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
    zIndex: 1,
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
  zoomButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  zoomText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  proControls: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
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
    zIndex: 1,
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
});