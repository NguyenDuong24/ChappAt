import { useState } from 'react';
import { Alert } from 'react-native';
import contentModerationService, { ModerationResult, ImageModerationResult } from '../services/contentModerationService';

interface ModerationAlert {
  showWarning: (
    textResult?: ModerationResult,
    imageResult?: ImageModerationResult,
    options?: {
      onEdit?: () => void;
      onIgnore?: () => void;
      onReplaceImage?: () => void;
      imageUri?: string;
    }
  ) => void;
  isModalVisible: boolean;
  modalProps: {
    visible: boolean;
    onClose: () => void;
    title: string;
    message: string;
    violationType?: 'profanity' | 'nsfw' | 'custom' | 'image';
    blockedWords?: string[];
    imageDetails?: {
      confidence: number;
      reason: string;
      imageUri?: string;
    };
    onEdit?: () => void;
    onIgnore?: () => void;
    onReplaceImage?: () => void;
  };
}

export const useModerationAlert = (): ModerationAlert => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalProps, setModalProps] = useState<any>({
    visible: false,
    onClose: () => setIsModalVisible(false),
    title: '',
    message: '',
  });

  const showWarning = (
    textResult?: ModerationResult,
    imageResult?: ImageModerationResult,
    options?: {
      onEdit?: () => void;
      onIgnore?: () => void;
      onReplaceImage?: () => void;
      imageUri?: string;
    }
  ) => {
    let title = '';
    let message = '';
    let violationType: 'profanity' | 'nsfw' | 'custom' | 'image' = 'custom';
    let blockedWords: string[] | undefined;
    let imageDetails: any = undefined;

    // Xử lý text moderation result
    if (textResult && !textResult.isClean) {
      switch (textResult.violationType) {
        case 'profanity':
          title = '⚠️ Ngôn ngữ không phù hợp';
          message = 'Tin nhắn của bạn chứa từ ngữ không phù hợp. Vui lòng sử dụng ngôn từ lịch sự hơn.';
          violationType = 'profanity';
          blockedWords = textResult.blockedWords;
          break;
        case 'custom':
          title = '⚠️ Nội dung bị hạn chế';
          message = 'Tin nhắn chứa nội dung không được phép theo quy định cộng đồng.';
          violationType = 'custom';
          blockedWords = textResult.blockedWords;
          break;
        default:
          title = '⚠️ Nội dung không phù hợp';
          message = 'Tin nhắn không tuân thủ quy định của cộng đồng.';
          violationType = 'custom';
          break;
      }
    }

    // Xử lý image moderation result
    if (imageResult && imageResult.isInappropriate) {
      title = '🚫 Hình ảnh không phù hợp';
      message = 'Hình ảnh bạn chọn có thể chứa nội dung không phù hợp hoặc vi phạm quy định cộng đồng.';
      violationType = 'image';
      
      imageDetails = {
        confidence: imageResult.confidence,
        reason: imageResult.reason || 'Không thể xác định lý do cụ thể',
        imageUri: options?.imageUri,
      };
    }

    // Nếu cả text và image đều có vấn đề
    if (textResult && !textResult.isClean && imageResult && imageResult.isInappropriate) {
      title = '🚫 Nội dung và hình ảnh không phù hợp';
      message = 'Cả tin nhắn và hình ảnh đều chứa nội dung không phù hợp. Vui lòng kiểm tra lại.';
    }

    const props = {
      visible: true,
      onClose: () => setIsModalVisible(false),
      title,
      message,
      violationType,
      blockedWords,
      imageDetails,
      onEdit: options?.onEdit ? () => {
        setIsModalVisible(false);
        options.onEdit?.();
      } : undefined,
      onIgnore: options?.onIgnore ? () => {
        setIsModalVisible(false);
        options.onIgnore?.();
      } : undefined,
      onReplaceImage: options?.onReplaceImage ? () => {
        setIsModalVisible(false);
        options.onReplaceImage?.();
      } : undefined,
    };

    setModalProps(props);
    setIsModalVisible(true);
  };

  return {
    showWarning,
    isModalVisible,
    modalProps: {
      ...modalProps,
      visible: isModalVisible,
    },
  };
};

// Hook để kiểm tra và hiển thị cảnh báo tự động
export const useContentModeration = () => {
  const { showWarning, isModalVisible, modalProps } = useModerationAlert();

  const checkAndShowWarning = async (
    text?: string,
    imageUri?: string,
    options?: {
      onEdit?: () => void;
      onIgnore?: () => void;
      onReplaceImage?: () => void;
    }
  ): Promise<boolean> => {
    try {
      const result = await contentModerationService.moderateContent(text, imageUri);
      
      if (!result.isContentClean) {
        showWarning(result.textResult, result.imageResult, {
          ...options,
          imageUri,
        });
        return false; // Content không clean
      }
      
      return true; // Content clean
    } catch (error) {
      console.error('Error checking content moderation:', error);
      
      // Hiển thị warning generic nếu có lỗi
      Alert.alert(
        'Lỗi kiểm tra nội dung',
        'Không thể kiểm tra tính an toàn của nội dung. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
      
      return false;
    }
  };

  const checkTextOnly = async (text: string): Promise<{
    isClean: boolean;
    result?: ModerationResult;
  }> => {
    try {
      const result = await contentModerationService.moderateText(text);
      return {
        isClean: result.isClean,
        result,
      };
    } catch (error) {
      console.error('Error checking text moderation:', error);
      return { isClean: false };
    }
  };

  const checkImageOnly = async (imageUri: string): Promise<{
    isClean: boolean;
    result?: ImageModerationResult;
  }> => {
    try {
      const result = await contentModerationService.moderateImage(imageUri);
      return {
        isClean: !result.isInappropriate,
        result,
      };
    } catch (error) {
      console.error('Error checking image moderation:', error);
      return { isClean: false };
    }
  };

  return {
    checkAndShowWarning,
    checkTextOnly,
    checkImageOnly,
    showWarning,
    isModalVisible,
    modalProps,
  };
};

export default useModerationAlert;
