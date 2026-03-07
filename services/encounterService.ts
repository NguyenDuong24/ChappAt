import { db } from '@/firebaseConfig';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
    doc,
    getDoc,
    setDoc
} from 'firebase/firestore';

export interface Encounter {
    id: string;
    otherUserId: string;
    timestamp: any;
    location: {
        latitude: number;
        longitude: number;
    };
    distance: number;
    userData?: {
        name?: string;
        photoURL?: string;
        age?: number;
        bio?: string;
    };
}

const COOLDOWN_MINUTES = 60;

export const encounterService = {
    /**
     * Record an encounter between two users
     */
    async recordEncounter(myId: string, otherUserId: string, distance: number, location: { latitude: number, longitude: number }) {
        if (!myId || !otherUserId || myId === otherUserId) return;

        try {
            // 1. Check cooldown: Has there been an encounter in the last hour?
            const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
            const encountersRef = collection(db, 'user_encounters', myId, 'history');

            const q = query(
                encountersRef,
                where('otherUserId', '==', otherUserId),
                where('timestamp', '>', Timestamp.fromDate(cooldownTime)),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                // Cooldown active, don't record
                return;
            }

            // 2. Record for current user
            const encounterData = {
                otherUserId,
                distance,
                location,
                timestamp: serverTimestamp(),
            };

            await addDoc(collection(db, 'user_encounters', myId, 'history'), encounterData);

            // 3. Record for the other user as well (symmetric)
            const symmetricEncounterData = {
                otherUserId: myId,
                distance,
                location,
                timestamp: serverTimestamp(),
            };

            await addDoc(collection(db, 'user_encounters', otherUserId, 'history'), symmetricEncounterData);

            console.log(`✅ Encounter recorded between ${myId} and ${otherUserId}`);
        } catch (error) {
            console.error('❌ Error recording encounter:', error);
        }
    },

    /**
     * Get encounter history for a user
     */
    async getEncounters(userId: string, limitCount: number = 50): Promise<Encounter[]> {
        if (!userId) return [];

        try {
            const encountersRef = collection(db, 'user_encounters', userId, 'history');
            const q = query(
                encountersRef,
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            const encounters: Encounter[] = [];

            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();
                const encounter: Encounter = {
                    id: docSnap.id,
                    otherUserId: data.otherUserId,
                    timestamp: data.timestamp,
                    distance: data.distance,
                    location: data.location,
                };

                // Fetch other user profile data
                try {
                    const userDoc = await getDoc(doc(db, 'users', data.otherUserId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        encounter.userData = {
                            name: userData.name || userData.displayName || userData.username || 'Người dùng',
                            photoURL: userData.photoURL || userData.profileUrl || userData.avatar,
                            age: userData.age,
                            bio: userData.bio,
                        };
                    }
                } catch (err) {
                    console.error(`Error fetching user profile for encounter ${data.otherUserId}:`, err);
                }

                encounters.push(encounter);
            }

            return encounters;
        } catch (error) {
            console.error('❌ Error fetching encounters:', error);
            return [];
        }
    }
};

export default encounterService;
