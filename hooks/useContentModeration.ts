import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import contentModerationService, { ModerationResult, ImageModerationResult } from '../services/contentModerationService';

interface UseModerationOptions {
  autoBlock?: boolean; // Tự động chặn nội dung không phù hợp
  showWarning?: boolean; // Hiển thị cảnh báo cho người dùng
  onViolation?: (result: ModerationResult | ImageModerationResult) => void; // Callback khi phát hiện vi phạm
}

export const useContentModeration = (options: UseModerationOptions = {}) => {
  const {
    autoBlock = true,
    showWarning = true,
    onViolation
  } = options;

  const [isChecking, setIsChecking] = useState(false);

  /**
   * Kiểm tra text trước khi gửi
   */
  const checkText = useCallback(async (text: string): Promise<boolean> => {
    if (!text?.trim()) return true;

    setIsChecking(true);
    try {
      const result = await contentModerationService.moderateText(text);
      
      if (!result.isClean) {
        // Gọi callback nếu có
        onViolation?.(result);

        // Hiển thị cảnh báo
        if (showWarning) {
          const message = contentModerationService.generateWarningMessage(result);
          Alert.alert('Nội dung không phù hợp', message);
        }

        // Trả về false nếu auto block
        return !autoBlock;
      }

      return true;
    } catch (error) {
      console.error('Error checking text:', error);
      return true; // Cho phép gửi nếu có lỗi
    } finally {
      setIsChecking(false);
    }
  }, [autoBlock, showWarning, onViolation]);

  /**
   * Kiểm tra hình ảnh trước khi gửi
   */
  const checkImage = useCallback(async (imageUri: string): Promise<boolean> => {
    if (!imageUri) return true;

    console.log('🖼️ Checking image:', imageUri);
    setIsChecking(true);
    try {
      const result = await contentModerationService.moderateImage(imageUri);
      
      console.log('🖼️ Image moderation result:', {
        isInappropriate: result.isInappropriate,
        confidence: result.confidence,
        reason: result.reason
      });
      
      if (result.isInappropriate) {
        // Gọi callback nếu có
        onViolation?.(result);

        // Hiển thị cảnh báo chi tiết
        if (showWarning) {
          const message = contentModerationService.generateWarningMessage(result);
          const detailedMessage = `${message}\n\nChi tiết:\n• Độ tin cậy: ${(result.confidence * 100).toFixed(1)}%\n• Lý do: ${result.reason || 'Không rõ'}`;
          Alert.alert('Hình ảnh không phù hợp', detailedMessage, [
            { text: 'Đã hiểu', style: 'default' },
            { text: 'Xem chi tiết', onPress: () => console.log('Image blocked:', result) }
          ]);
        }

        // Trả về false nếu auto block
        return !autoBlock;
      }

      console.log('✅ Image passed moderation check');
      return true;
    } catch (error) {
      console.error('❌ Error checking image:', error);
      return true; // Cho phép gửi nếu có lỗi
    } finally {
      setIsChecking(false);
    }
  }, [autoBlock, showWarning, onViolation]);

  /**
   * Kiểm tra toàn bộ nội dung (text + image)
   */
  const checkContent = useCallback(async (
    text?: string, 
    imageUri?: string
  ): Promise<boolean> => {
    if (!text?.trim() && !imageUri) return true;

    console.log('🧪 [checkContent] Input:', { hasText: !!text?.trim(), hasImage: !!imageUri });
    setIsChecking(true);
    try {
      const result = await contentModerationService.moderateContent(text, imageUri);
      console.log('🧪 [checkContent] Service result:', {
        textResult: result.textResult,
        imageResult: result.imageResult,
        isContentClean: result.isContentClean,
      });
      
      if (!result.isContentClean) {
        // Xử lý kết quả text
        if (result.textResult && !result.textResult.isClean) {
          onViolation?.(result.textResult);
          console.log('⛔ [checkContent] Text violation detected');
          
          if (showWarning) {
            const message = contentModerationService.generateWarningMessage(result.textResult);
            Alert.alert('Text không phù hợp', message);
          }
        }

        // Xử lý kết quả image
        if (result.imageResult && result.imageResult.isInappropriate) {
          onViolation?.(result.imageResult);
          console.log('⛔ [checkContent] Image violation detected:', {
            confidence: result.imageResult.confidence,
            reason: result.imageResult.reason,
          });
          
          if (showWarning) {
            const message = contentModerationService.generateWarningMessage(result.imageResult);
            Alert.alert('Hình ảnh không phù hợp', message);
          }
        }

        const finalAllowed = !autoBlock;
        console.log('🧮 [checkContent] Final allowed =', finalAllowed, '(autoBlock =', autoBlock, ')');
        return finalAllowed;
      }

      console.log('✅ [checkContent] Content clean -> allow');
      return true;
    } catch (error) {
      console.error('❌ [checkContent] Error checking content:', error);
      return true;
    } finally {
      setIsChecking(false);
    }
  }, [autoBlock, showWarning, onViolation]);

  /**
   * Lọc text và trả về phiên bản đã được làm sạch
   */
  const filterText = useCallback(async (text: string): Promise<string> => {
    if (!text?.trim()) return text;

    try {
      const result = await contentModerationService.moderateText(text);
      return result.filteredText || text;
    } catch (error) {
      console.error('Error filtering text:', error);
      return text;
    }
  }, []);

  return {
    checkText,
    checkImage,
    checkContent,
    filterText,
    isChecking
  };
};

export default useContentModeration;
