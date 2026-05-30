import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { uploadLocalFileToStorage } from '@/utils/storageUpload';
import { nsfwService } from './nsfwService';

type PublishContext = 'private_chat' | 'group_chat' | 'post';

export type ImageModerationContext = {
  context: PublishContext;
  actorId?: string | null;
  actorName?: string | null;
  roomId?: string | null;
  peerId?: string | null;
  groupId?: string | null;
  postId?: string | null;
  source?: string | null;
};

export type ImageModerationGuardResult = {
  allowed: boolean;
  reason: string;
  scores: Record<string, number>;
  flaggedContentId?: string;
  flaggedImageUrl?: string | null;
};

const BLOCKED_REASON_FALLBACK = 'Sensitive image detected';

const buildFlaggedStoragePath = (actorId?: string | null) => {
  const owner = actorId || 'anonymous';
  return `flagged-content/${owner}/${Date.now()}.jpg`;
};

const logFlaggedImage = async (
  uri: string,
  context: ImageModerationContext,
  reason: string,
  scores: Record<string, number>,
) => {
  let flaggedImageUrl: string | null = null;
  let storageError: string | null = null;

  try {
    flaggedImageUrl = await uploadLocalFileToStorage({
      uri,
      path: buildFlaggedStoragePath(context.actorId),
      contentType: 'image/jpeg',
      maxRetries: 1,
      metadata: {
        customMetadata: {
          moderationContext: context.context,
          actorId: context.actorId || '',
        },
      },
    });
  } catch (error: any) {
    storageError = error?.message || String(error);
    console.warn('[imageModerationGuard] Failed to upload flagged image:', error);
  }

  const docRef = await addDoc(collection(db, 'flagged_content'), {
    context: context.context,
    createdAt: serverTimestamp(),
    actorId: context.actorId || null,
    senderId: context.actorId || null,
    actorName: context.actorName || '',
    senderName: context.actorName || '',
    roomId: context.roomId || null,
    peerId: context.peerId || null,
    groupId: context.groupId || null,
    postId: context.postId || null,
    source: context.source || null,
    localUri: uri,
    imageUrl: flaggedImageUrl,
    flaggedImageUrl,
    storageError,
    reason,
    scores,
    status: 'pending',
    type: 'image',
    action: 'blocked_before_publish',
  });

  return {
    flaggedContentId: docRef.id,
    flaggedImageUrl,
  };
};

export const moderateImageBeforePublish = async (
  uri: string,
  context: ImageModerationContext,
): Promise<ImageModerationGuardResult> => {
  if (!uri) {
    return {
      allowed: false,
      reason: 'Missing image URI',
      scores: {},
    };
  }

  const result = await nsfwService.classifyImage(uri);

  if (!result.isInappropriate) {
    return {
      allowed: true,
      reason: result.reason || 'Safe',
      scores: result.scores || {},
    };
  }

  const reason = result.reason || BLOCKED_REASON_FALLBACK;
  const scores = result.scores || {};
  const flagged = await logFlaggedImage(uri, context, reason, scores);

  return {
    allowed: false,
    reason,
    scores,
    ...flagged,
  };
};

export const getSensitiveImageBlockMessage = (reason?: string) => {
  const suffix = reason ? `\n\nLy do: ${reason}` : '';
  return `Anh nay co the chua noi dung nhay cam nen da bi chan. Vui long chon anh khac.${suffix}`;
};
