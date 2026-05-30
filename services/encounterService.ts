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
const SIGNAL_WINDOW_MS = 2 * 60 * 1000;

export interface NearMatchSettings {
    enabled: boolean;
    allowNotifications: boolean;
    showProfileBadge: boolean;
    matchRadiusMeters: number;
    updatedAt?: any;
}

export interface EncounterSummary {
    id: string;
    otherUserId: string;
    timestamp: any;
    distance: number;
}

const DEFAULT_NEAR_MATCH_SETTINGS: NearMatchSettings = {
    enabled: false,
    allowNotifications: true,
    showProfileBadge: true,
    matchRadiusMeters: 50,
};

const getPairKey = (userA: string, userB: string) => [userA, userB].sort().join('_');

export const encounterService = {
    async getNearMatchSettings(userId: string): Promise<NearMatchSettings> {
        if (!userId) return DEFAULT_NEAR_MATCH_SETTINGS;

        try {
            const settingsSnap = await getDoc(doc(db, 'near_match_settings', userId));
            if (!settingsSnap.exists()) return DEFAULT_NEAR_MATCH_SETTINGS;

            return {
                ...DEFAULT_NEAR_MATCH_SETTINGS,
                ...(settingsSnap.data() as Partial<NearMatchSettings>),
            };
        } catch (error) {
            console.error('❌ Error fetching near match settings:', error);
            return DEFAULT_NEAR_MATCH_SETTINGS;
        }
    },

    async updateNearMatchSettings(userId: string, settings: Partial<NearMatchSettings>): Promise<NearMatchSettings> {
        if (!userId) return DEFAULT_NEAR_MATCH_SETTINGS;

        const nextSettings = {
            ...DEFAULT_NEAR_MATCH_SETTINGS,
            ...settings,
            updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'near_match_settings', userId), nextSettings, { merge: true });
        return nextSettings;
    },

    /**
     * Record an encounter between two users
     */
    async recordEncounter(myId: string, otherUserId: string, distance: number, location: { latitude: number, longitude: number, address?: string }) {
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

            await setDoc(doc(db, 'nearby_encounters', getPairKey(myId, otherUserId)), {
                userIds: [myId, otherUserId].sort(),
                lastDistance: distance,
                lastDistanceBucket: distance <= 10 ? '0-10m' : distance <= 50 ? '10-50m' : '50m+',
                lastLocation: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address || null,
                },
                firstSeenAt: serverTimestamp(),
                lastSeenAt: serverTimestamp(),
                status: 'detected',
            }, { merge: true });

            console.log(`âœ… Encounter recorded between ${myId} and ${otherUserId}`);
        } catch (error) {
            console.error('âŒ Error recording encounter:', error);
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
                            name: userData.name || userData.displayName || userData.username || 'NgÆ°á»i dÃ¹ng',
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
            console.error('âŒ Error fetching encounters:', error);
            return [];
        }
    },

    async getEncounterWithUser(myId: string, otherUserId: string): Promise<EncounterSummary | null> {
        if (!myId || !otherUserId || myId === otherUserId) return null;

        try {
            const encountersRef = collection(db, 'user_encounters', myId, 'history');
            const q = query(
                encountersRef,
                where('otherUserId', '==', otherUserId),
                orderBy('timestamp', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const docSnap = snapshot.docs[0];
            const data = docSnap.data();
            return {
                id: docSnap.id,
                otherUserId: data.otherUserId,
                timestamp: data.timestamp,
                distance: data.distance,
            };
        } catch (error) {
            console.error('❌ Error fetching encounter with user:', error);
            return null;
        }
    },

    async sendNearMatchSignal(myId: string, otherUserId: string): Promise<{ matched: boolean; matchId?: string }> {
        if (!myId || !otherUserId || myId === otherUserId) return { matched: false };

        const pairKey = getPairKey(myId, otherUserId);
        const now = Date.now();
        const signalRef = doc(db, 'nearby_encounters', pairKey, 'signals', myId);
        const otherSignalRef = doc(db, 'nearby_encounters', pairKey, 'signals', otherUserId);

        await setDoc(signalRef, {
            userId: myId,
            type: 'shake',
            createdAt: serverTimestamp(),
            createdAtMs: now,
        }, { merge: true });

        const otherSignalSnap = await getDoc(otherSignalRef);
        const otherSignal = otherSignalSnap.exists() ? otherSignalSnap.data() : null;
        const isMatched = typeof otherSignal?.createdAtMs === 'number' && now - otherSignal.createdAtMs <= SIGNAL_WINDOW_MS;

        if (!isMatched) {
            await setDoc(doc(db, 'nearby_encounters', pairKey), {
                status: 'signaled',
                lastSignalAt: serverTimestamp(),
            }, { merge: true });
            return { matched: false };
        }

        const userIds = [myId, otherUserId].sort();
        await setDoc(doc(db, 'matches', pairKey), {
            userIds,
            userAId: userIds[0],
            userBId: userIds[1],
            source: 'nearby_shake',
            createdAt: serverTimestamp(),
        }, { merge: true });
        await setDoc(doc(db, 'nearby_encounters', pairKey), {
            status: 'matched',
            matchedAt: serverTimestamp(),
        }, { merge: true });

        return { matched: true, matchId: pairKey };
    }
};

export default encounterService;
