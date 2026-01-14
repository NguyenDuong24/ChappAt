import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { coinServerApi } from '@/src/services/coinServerApi';

export const useIsPremium = () => {
    const { user } = useAuth();
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkPremiumStatus = async () => {
            if (!user?.uid) {
                setIsPremium(false);
                setLoading(false);
                return;
            }

            try {
                const myItemsData = await coinServerApi.getMyItems();
                const myItems = myItemsData.items || [];

                // Check if user owns any VIP items that are not expired
                const now = new Date();
                const hasVip = myItems.some((item: any) => {
                    const isVipItem = item.itemId?.startsWith('vip_') || item.itemId === 'vip_badge';
                    if (!isVipItem) return false;

                    if (item.expiresAt) {
                        const expiryDate = new Date(item.expiresAt);
                        return expiryDate > now;
                    }

                    return true; // If no expiry, assume it's permanent (though VIP usually has expiry)
                });

                setIsPremium(hasVip);
            } catch (error) {
                console.error('Error checking premium status:', error);
                setIsPremium(false);
            } finally {
                setLoading(false);
            }
        };

        checkPremiumStatus();
    }, [user?.uid]);

    return { isPremium, loading };
};
