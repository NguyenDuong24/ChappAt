import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface CallData {
  id: string;
  callerId: string;
  receiverId: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'cancelled';
  meetingId?: string;
  timestamp: any;
  callerInfo?: {
    name: string;
    profileUrl?: string;
  };
}

export class CallService {
  
  // Create new call
  static async createCall(receiverId: string, meetingId: string, callType: 'audio' | 'video'): Promise<string> {
    try {
      const callRef = doc(collection(db, 'calls'));
      const callId = callRef.id;
      
      const newCall: Omit<CallData, 'id'> = {
        callerId: 'current-user-id', // Replace with actual user ID
        receiverId,
        callType,
        status: 'ringing',
        meetingId,
        timestamp: serverTimestamp(),
      };
      
      await setDoc(callRef, { ...newCall, id: callId });
      console.log('✅ Call created:', callId);
      return callId;
    } catch (error) {
      console.error('❌ Error creating call:', error);
      throw error;
    }
  }
  
  // Accept call
  static async acceptCall(callId: string) {
    try {
      const callRef = doc(db, 'calls', callId);
      await updateDoc(callRef, { 
        status: 'accepted',
        timestamp: serverTimestamp() 
      });
      console.log('✅ Call accepted:', callId);
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      throw error;
    }
  }

  // Reject call
  static async rejectCall(callId: string) {
    try {
      const callRef = doc(db, 'calls', callId);
      await updateDoc(callRef, { 
        status: 'rejected',
        timestamp: serverTimestamp() 
      });
      console.log('✅ Call rejected:', callId);
    } catch (error) {
      console.error('❌ Error rejecting call:', error);
      throw error;
    }
  }

  // End call
  static async endCall(meetingId: string) {
    try {
      const callsQuery = query(
        collection(db, 'calls'),
        where('meetingId', '==', meetingId),
        where('status', 'in', ['ringing', 'accepted'])
      );
      
      const snapshot = await getDocs(callsQuery);
      const updatePromises = snapshot.docs.map(docRef => 
        updateDoc(docRef.ref, { 
          status: 'ended',
          timestamp: serverTimestamp() 
        })
      );
      
      await Promise.all(updatePromises);
      console.log('✅ Call ended for meeting:', meetingId);
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  // Listen to incoming calls for a user
  static listenToIncomingCalls(userId: string, onCallReceived: (call: CallData) => void) {
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', '==', 'ringing'),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const callData = change.doc.data() as CallData;
          onCallReceived(callData);
        }
      });
    });
  }

  // Listen to call status changes
  static listenToCallStatus(callId: string, onStatusChange: (status: string) => void) {
    const callRef = doc(db, 'calls', callId);
    
    return onSnapshot(callRef, (doc) => {
      if (doc.exists()) {
        const callData = doc.data() as CallData;
        onStatusChange(callData.status);
      }
    });
  }

  // Clean up old calls (utility function)
  static async cleanupOldCalls() {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const callsQuery = query(
        collection(db, 'calls'),
        where('timestamp', '<', oneDayAgo)
      );
      
      const snapshot = await getDocs(callsQuery);
      const deletePromises = snapshot.docs.map((docRef) => deleteDoc(docRef.ref));
      
      await Promise.all(deletePromises);
      console.log('✅ Old calls cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up calls:', error);
    }
  }
}
