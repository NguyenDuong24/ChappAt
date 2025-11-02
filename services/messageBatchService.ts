import { 
  doc, 
  updateDoc, 
  writeBatch, 
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

class MessageBatchService {
  private updateQueue: Map<string, any> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 1000; // 1 second delay
  private readonly MAX_BATCH_SIZE = 500; // Firestore limit

  // Batch update message status
  batchUpdateMessageStatus(roomId: string, messageId: string, status: string, userId: string) {
    const key = `${roomId}_${messageId}`;
    
    this.updateQueue.set(key, {
      roomId,
      messageId,
      status,
      userId,
      timestamp: Date.now()
    });

    this.scheduleBatchProcess();
  }

  // Batch mark messages as read
  batchMarkAsRead(roomId: string, messageIds: string[], userId: string) {
    messageIds.forEach(messageId => {
      this.batchUpdateMessageStatus(roomId, messageId, 'read', userId);
    });
  }

  private scheduleBatchProcess() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  private async processBatch() {
    if (this.updateQueue.size === 0) return;

    const updates = Array.from(this.updateQueue.values());
    this.updateQueue.clear();

    // Group by room for better performance
    const roomGroups = new Map<string, any[]>();
    updates.forEach(update => {
      if (!roomGroups.has(update.roomId)) {
        roomGroups.set(update.roomId, []);
      }
      roomGroups.get(update.roomId)!.push(update);
    });

    // Process each room separately
    const promises = Array.from(roomGroups.entries()).map(([roomId, roomUpdates]) => 
      this.processBatchForRoom(roomId, roomUpdates)
    );

    try {
      await Promise.all(promises);
      console.log('✅ Batch update completed for', updates.length, 'messages');
    } catch (error) {
      console.error('❌ Batch update failed:', error);
    }
  }

  private async processBatchForRoom(roomId: string, updates: any[]) {
    const batch = writeBatch(db);
    let operationCount = 0;

    for (const update of updates) {
      if (operationCount >= this.MAX_BATCH_SIZE) {
        await batch.commit();
        operationCount = 0;
      }

      const messageRef = doc(db, 'rooms', roomId, 'messages', update.messageId);
      
      batch.update(messageRef, {
        status: update.status,
        [`${update.status}At`]: serverTimestamp(),
        [`${update.status}By`]: update.userId,
        updatedAt: serverTimestamp()
      });

      operationCount++;
    }

    if (operationCount > 0) {
      await batch.commit();
    }
  }

  // Batch cleanup old messages
  async cleanupOldMessages(roomId: string, olderThanDays: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
      const q = query(
        messagesRef,
        where('createdAt', '<', cutoffDate)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length === 0) return;

      const batch = writeBatch(db);
      let operationCount = 0;

      snapshot.docs.forEach(docSnapshot => {
        if (operationCount >= this.MAX_BATCH_SIZE) return;
        
        batch.delete(docSnapshot.ref);
        operationCount++;
      });

      await batch.commit();
      console.log('✅ Cleaned up', operationCount, 'old messages');
    } catch (error) {
      console.error('❌ Error cleaning up messages:', error);
    }
  }

  // Force flush pending updates
  async flush() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.processBatch();
  }
}

export default new MessageBatchService();
