import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const { width, height } = Dimensions.get('window');

interface PhotoEditorScreenProps {
  photoUri: string;
  onBack: () => void;
  onSave: (editedPhotoUri?: string) => void;
}

interface Style {
  id: string;
  name: string;
  emoji?: string;
  thumbnail?: string;
  isOriginal?: boolean;
}

const REPLICATE_API_TOKEN = '2d5c9943ab9f474e31a20312ea71300bf8f09d5d';

const PhotoEditorScreen: React.FC<PhotoEditorScreenProps> = ({
  photoUri,
  onBack,
  onSave
}) => {
  const insets = useSafeAreaInsets();
  const [selectedStyle, setSelectedStyle] = useState<string>('original');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editedPhotoUri, setEditedPhotoUri] = useState<string | null>(null);

  const styles_list: Style[] = [
    {
      id: 'original',
      name: 'Original',
      isOriginal: true
    },
    {
      id: 'banana',
      name: 'Banana',
      emoji: '🍌'
    },
    {
      id: 'joker',
      name: 'Joker',
      emoji: '🃏'
    },
    {
      id: 'monkey',
      name: 'Monkey',
      emoji: '🐵'
    },
    {
      id: 'office',
      name: 'Office',
      emoji: '🏢'
    },
    {
      id: 'pirate',
      name: 'Pirate',
      emoji: '🏴‍☠️'
    },
    {
      id: 'anime',
      name: 'Anime',
      emoji: '🎭'
    },
    {
      id: 'alien',
      name: 'Alien',
      emoji: '👽'
    },
    {
      id: 'sherlock',
      name: 'Sherlock',
      emoji: '🔍'
    },
    {
      id: 'vampire',
      name: 'Vampire',
      emoji: '🧛'
    }
  ];

  const uploadToTmpFiles = async (fileUri: string): Promise<string> => {
    try {
      if (!fileUri || !fileUri.startsWith('file://')) {
        throw new Error('uploadToTmpFiles expects a file:// URI');
      }
      // Determine file type and name based on URI
      let fileName = 'photo.jpg';
      let mimeType = 'image/jpeg';
      
      if (fileUri.includes('banana.png') || fileUri.endsWith('banana.png')) {
        fileName = 'banana.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('joker.png') || fileUri.endsWith('joker.png')) {
        fileName = 'joker.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('monkey.png') || fileUri.endsWith('monkey.png')) {
        fileName = 'monkey.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('office.png') || fileUri.endsWith('office.png')) {
        fileName = 'office.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('pirate.png') || fileUri.endsWith('pirate.png')) {
        fileName = 'pirate.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('anime.png') || fileUri.endsWith('anime.png')) {
        fileName = 'anime.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('alien.png') || fileUri.endsWith('alien.png')) {
        fileName = 'alien.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('sherlock.png') || fileUri.endsWith('sherlock.png')) {
        fileName = 'sherlock.png';
        mimeType = 'image/png';
      } else if (fileUri.includes('vampire.png') || fileUri.endsWith('vampire.png')) {
        fileName = 'vampire.png';
        mimeType = 'image/png';
      } else if (fileUri.endsWith('.png')) {
        fileName = 'style.png';
        mimeType = 'image/png';
      }
      
      console.log('Uploading file:', fileName, 'from URI:', fileUri);
      
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName
      } as any);

      const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('TmpFiles upload result:', result);
      
      if (result.status === 'success' && result.data?.url) {
        // Convert download URL to direct URL
        const directUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        console.log('Direct URL:', directUrl);
        return directUrl;
      } else {
        throw new Error('Failed to upload to tmpfiles');
      }
    } catch (error) {
      console.error('TmpFiles upload error:', error);
      throw error;
    }
  };

  const uploadStyleImage = async (): Promise<string> => {
    try {
      if (selectedStyle === 'original') {
        // For original style, no style image needed
        throw new Error('Original style does not require a style image');
      }

      console.log(`Loading ${selectedStyle} style image from assets...`);
      
      // Resolve the correct module for the style and ensure a real file:// URI
      const styleModule = (() => {
        switch (selectedStyle) {
          case 'banana':
            return require('../assets/styles/banana.png');
          case 'joker':
            return require('../assets/styles/joker.png');
          case 'monkey':
            return require('../assets/styles/monkey.png');
          case 'office':
            return require('../assets/styles/office.png');
          case 'pirate':
            return require('../assets/styles/pirate.png');
          case 'anime':
            return require('../assets/styles/anime.png');
          case 'alien':
            return require('../assets/styles/alien.png');
          case 'sherlock':
            return require('../assets/styles/sherlock.png');
          case 'vampire':
            return require('../assets/styles/vampire.png');
          default:
            throw new Error(`Unknown style: ${selectedStyle}`);
        }
      })();

      const styleAsset = Asset.fromModule(styleModule);
      await styleAsset.downloadAsync();

      const resolvedUri = styleAsset.localUri || styleAsset.uri;
      console.log(`${selectedStyle} asset URI:`, resolvedUri);
      console.log(`${styleModule} <- WHAT? 1!`);
      console.log(`${styleAsset.uri} <- WHAT? 2!`);
      console.log(`${styleAsset.localUri} <- WHAT? 3!`);
      
      // If we don't have a proper file:// URI, try to copy the asset to a local file
      let finalUri = resolvedUri;
      if (!resolvedUri || !resolvedUri.startsWith('file://')) {
        console.log('Asset URI is not file://, trying to copy to local file...');
        const localPath = `${FileSystem.documentDirectory}${selectedStyle}_style.png`;
        
        try {
          // Try to copy using the asset URI (even if it's not file://)
          await FileSystem.copyAsync({
            from: resolvedUri,
            to: localPath
          });
          finalUri = localPath;
          console.log(`Successfully copied asset to: ${finalUri}`);
        } catch (copyError) {
          console.error('Failed to copy asset:', copyError);
          
          // Last resort: try bundle directory
          try {
            const bundlePath = `${FileSystem.bundleDirectory}assets/styles/${selectedStyle}.png`;
            console.log(`Trying bundle path: ${bundlePath}`);
            
            const fileInfo = await FileSystem.getInfoAsync(bundlePath);
            if (fileInfo.exists) {
              finalUri = bundlePath;
              console.log(`Found style in bundle: ${finalUri}`);
            } else {
              throw new Error(`Bundle file does not exist: ${bundlePath}`);
            }
          } catch (bundleError) {
            console.error('Bundle approach also failed:', bundleError);
            throw new Error('Failed to resolve style asset to a local file URI');
          }
        }
      }

      // Upload the style image to tmpfiles
      console.log(`Uploading ${selectedStyle} style to tmpfiles...`);
      const styleUrl = await uploadToTmpFiles(finalUri);
      console.log(`${selectedStyle} style uploaded to:`, styleUrl);

      return styleUrl;
    } catch (error) {
      console.error('Error loading style image:', error);
      // For non-original styles, try to load a default style
      if (selectedStyle !== 'original') {
        try {
          // Use banana as fallback style
          const fallbackAsset = Asset.fromModule(require('../assets/styles/banana.png'));
          await fallbackAsset.downloadAsync();
          const fallbackUri = fallbackAsset.localUri || fallbackAsset.uri;
          if (!fallbackUri || !fallbackUri.startsWith('file://')) {
            throw new Error('Fallback style is not a local file URI');
          }
          return await uploadToTmpFiles(fallbackUri);
        } catch (fallbackError) {
          console.error('Fallback style loading failed:', fallbackError);
          throw new Error('Failed to load any style image');
        }
      }
      throw error;
    }
  };

  const downloadImageFromUrl = async (imageUrl: string): Promise<string> => {
    try {
      console.log('Downloading image from:', imageUrl);
      
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `generated_${timestamp}.jpg`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Download the image
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri);
      console.log('Download result:', downloadResult);
      
      if (downloadResult.status === 200) {
        console.log('Image downloaded successfully to:', downloadResult.uri);
        return downloadResult.uri;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  const generateWithReplicate = async (imageUrl: string, styleUrl: string, attempt: number = 1): Promise<string> => {
    const maxRetries = 3;
    
    try {
      console.log(`Replicate generation attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.replicate.com/v1/models/google/nano-banana/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'
        },
        body: JSON.stringify({
          input: {
            prompt: "Use the FIRST image as the subject identity anchor. Preserve the exact face, age, skin tone, hair, and body proportions from the FIRST image.Apply ONLY the costume, materials, colors, lighting, background mood, and overall style from the SECOND image.Make the scene natural and photorealistic. Keep the same person from the FIRST image, no new characters.Do not change facial structure or identity. No cartoon look, no text, no logos, no distortions",
            image_input: [imageUrl, styleUrl]
          }
        })
      });

      const result = await response.json();
      console.log('Replicate result:', result);

      // Правильно извлекаем URL из ответа Replicate
      if (result.output) {
        const imageUrl = typeof result.output === 'string' ? result.output : result.output[0];
        console.log('Generated image URL:', imageUrl);
        
        // Скачиваем изображение локально
        const localImageUri = await downloadImageFromUrl(imageUrl);
        return localImageUri;
      } else {
        throw new Error('No output from Replicate');
      }
    } catch (error) {
      console.error(`Replicate generation error (attempt ${attempt}):`, error);
      
      // Если не последняя попытка, пробуем еще раз
      if (attempt < maxRetries) {
        console.log(`Retrying generation, attempt ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        return generateWithReplicate(imageUrl, styleUrl, attempt + 1);
      } else {
        // Если все попытки неудачны, показываем ошибку
        throw new Error(`Generation failed after ${maxRetries} attempts`);
      }
    }
  };

  const handleGenerateWithAI = async () => {
    if (selectedStyle === 'original') {
      onSave(photoUri);
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Starting AI generation...');
      
      // Upload original photo to tmpfiles
      console.log('Uploading photo to tmpfiles...');
      const photoUrl = await uploadToTmpFiles(photoUri);
      
      // Get style image URL
      console.log('Getting style image...');
      const styleUrl = await uploadStyleImage();
      
      // Generate with Replicate
      console.log('Generating with Replicate...');
      const localGeneratedImageUri = await generateWithReplicate(photoUrl, styleUrl);
      
      console.log('Local generated image URI:', localGeneratedImageUri);
      setEditedPhotoUri(localGeneratedImageUri);
      
      Alert.alert('Success', 'Image generated and saved locally!');
    } catch (error) {
      console.error('Generation error:', error);
      Alert.alert('Error', 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (editedPhotoUri) {
      onSave(editedPhotoUri);
    } else {
      onSave(photoUri);
    }
  };

  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    if (selectedStyle === 'original') return 'Save Photo';
    if (editedPhotoUri) return 'Save Photo';
    return 'Generate';
  };

  return (
    <View style={styles.container}>
      {/* Fullscreen Photo Background */}
      <Image 
        source={{ uri: editedPhotoUri || photoUri }} 
        style={styles.fullscreenPhoto}
        resizeMode="cover"
      />
      
      {/* Loading overlay */}
      {isGenerating && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loaderText}>Generating with AI...</Text>
        </View>
      )}

      {/* Header overlay */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Photo Editor</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Bottom controls overlay */}
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 20 }]}>
        {/* Styles Carousel */}
        <View style={styles.stylesSection}>
          <Text style={styles.stylesTitle}>Styles</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stylesCarousel}
          >
            {styles_list.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.styleItem,
                  selectedStyle === style.id && styles.styleItemSelected
                ]}
                onPress={() => setSelectedStyle(style.id)}
              >
                <View style={[
                  styles.stylePreview,
                  selectedStyle === style.id && styles.stylePreviewSelected
                ]}>
                  {style.emoji && (
                    <Text style={styles.styleEmoji}>{style.emoji}</Text>
                  )}
                  {style.isOriginal && (
                    <Text style={styles.originalText}>Original</Text>
                  )}
                </View>
                <Text style={styles.styleName}>{style.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isGenerating && styles.actionButtonDisabled
            ]}
            onPress={selectedStyle === 'original' || editedPhotoUri ? handleSave : handleGenerateWithAI}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="black" size="small" />
            ) : (
              <Download color="black" size={20} />
            )}
            <Text style={styles.actionButtonText}>{getButtonText()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullscreenPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: width,
    height: height,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSpacer: {
    width: 40,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loaderText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  stylesSection: {
    paddingTop: 30,
    paddingBottom: 20,
  },
  stylesTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  stylesCarousel: {
    paddingHorizontal: 20,
    gap: 15,
  },
  styleItem: {
    alignItems: 'center',
    width: 80,
  },
  styleItemSelected: {
    opacity: 1,
  },
  stylePreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stylePreviewSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  styleEmoji: {
    fontSize: 24,
  },
  originalText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  styleName: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  actionButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhotoEditorScreen;