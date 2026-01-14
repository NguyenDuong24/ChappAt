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
    getDoc
} from 'firebase/firestore';
import { proximityService } from './proximityService';

export interface ProfileVisit {
    id: string;
    visitorId: string;
    visitedId: string;
    timestamp: any;
    distance?: number;
    visitorData?: {
        username?: string;
        displayName?: string;
        profileUrl?: string;
    };
}

export const profileVisitService = {
    /**
     * Record a profile visit
     * @param visitorId ID of the user visiting the profile
     * @param visitedId ID of the user whose profile is being visited
     */
    async recordVisit(visitorId: string, visitedId: string) {
        if (!visitorId || !visitedId || visitorId === visitedId) return;

        try {
            // Check if there was a recent visit (e.g., in the last 1 hour) to avoid spamming
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const q = query(
                collection(db, 'profile_visits'),
                where('visitorId', '==', visitorId),
                where('visitedId', '==', visitedId),
                where('timestamp', '>', Timestamp.fromDate(oneHourAgo)),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                console.log('Recent visit already recorded');
                return;
            }

            await addDoc(collection(db, 'profile_visits'), {
                visitorId,
                visitedId,
                timestamp: serverTimestamp(),
            });
            console.log('Profile visit recorded successfully');
        } catch (error) {
            console.error('Error recording profile visit:', error);
        }
    },

    /**
     * Get visitors for a specific user
     * @param userId ID of the user to get visitors for
     * @param limitCount Maximum number of visitors to fetch
     */
    async getVisitors(userId: string, limitCount: number = 50): Promise<ProfileVisit[]> {
        if (!userId) return [];

        try {
            // Fetch visited user's location for distance calculation
            let visitedLocation: any = null;
            try {
                const visitedDoc = await getDoc(doc(db, 'users', userId));
                if (visitedDoc.exists()) {
                    visitedLocation = visitedDoc.data().location;
                }
            } catch (err) {
                console.error('Error fetching visited user location:', err);
            }

            const q = query(
                collection(db, 'profile_visits'),
                where('visitedId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            const visits: ProfileVisit[] = [];

            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();
                const visit: ProfileVisit = {
                    id: docSnap.id,
                    visitorId: data.visitorId,
                    visitedId: data.visitedId,
                    timestamp: data.timestamp,
                };

                // Fetch visitor details
                try {
                    const userDoc = await getDoc(doc(db, 'users', data.visitorId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        visit.visitorData = {
                            username: userData.username,
                            displayName: userData.displayName,
                            profileUrl: userData.profileUrl || userData.photoURL,
                        };

                        // Calculate distance if both locations are available
                        if (visitedLocation && userData.location) {
                            visit.distance = proximityService.calculateDistance(
                                visitedLocation.latitude,
                                visitedLocation.longitude,
                                userData.location.latitude,
                                userData.location.longitude
                            );
                        }
                    }
                } catch (userError) {
                    console.error(`Error fetching visitor data for ${data.visitorId}:`, userError);
                }

                visits.push(visit);
            }

            return visits;
        } catch (error) {
            console.error('Error fetching profile visitors:', error);
            return [];
        }
    }
};
