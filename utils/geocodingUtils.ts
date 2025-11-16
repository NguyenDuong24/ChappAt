import * as Location from 'expo-location';

/**
 * Safely reverse geocode coordinates to get address
 * Handles the "igmm: UNAVAILABLE" error gracefully
 */
export const safeReverseGeocodeAsync = async (
  coordinates: { latitude: number; longitude: number }
): Promise<Location.LocationGeocodedAddress[] | null> => {
  try {
    const addresses = await Location.reverseGeocodeAsync(coordinates);
    return addresses;
  } catch (error: any) {
    console.error('❌ Reverse geocoding failed:', error);

    // Handle specific Google Maps API errors
    if (error.message?.includes('igmm: UNAVAILABLE')) {
      console.warn('⚠️ Google Maps geocoding service unavailable. This may be due to:');
      console.warn('   - Missing Google Maps API key');
      console.warn('   - API quota exceeded');
      console.warn('   - Network connectivity issues');
      console.warn('   - Google Play Services not available');
    }

    // Return null to indicate geocoding failed
    return null;
  }
};

/**
 * Get a simple address string from coordinates
 * Returns a fallback if geocoding fails
 */
export const getAddressFromCoordinates = async (
  coordinates: { latitude: number; longitude: number },
  fallback: string = 'Unknown location'
): Promise<string> => {
  try {
    const addresses = await safeReverseGeocodeAsync(coordinates);
    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const parts = [
        address.street,
        address.city,
        address.region,
        address.country
      ].filter(Boolean);

      return parts.length > 0 ? parts.join(', ') : fallback;
    }
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
  }

  return fallback;
};

/**
 * Check if geocoding is available
 */
export const isGeocodingAvailable = async (): Promise<boolean> => {
  try {
    // Try a test geocoding request
    const testCoordinates = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
    const result = await safeReverseGeocodeAsync(testCoordinates);
    return result !== null;
  } catch {
    return false;
  }
};
