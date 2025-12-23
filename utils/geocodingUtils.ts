import * as Location from 'expo-location';

// Cache for geocoding results to reduce API calls
const geocodingCache = new Map<string, { address: Location.LocationGeocodedAddress[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Rate limiting
let lastGeocodingCall = 0;
const MIN_INTERVAL = 1000; // Minimum 1 second between calls

/**
 * Generate cache key from coordinates
 */
const getCacheKey = (lat: number, lon: number): string => {
  // Round to 4 decimal places (~11m accuracy) for better cache hits
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
};

/**
 * Safely reverse geocode coordinates to get address
 * Handles the "igmm: UNAVAILABLE" and other errors gracefully
 * Includes caching and rate limiting
 */
export const safeReverseGeocodeAsync = async (
  coordinates: { latitude: number; longitude: number },
  options?: { useCache?: boolean; retries?: number }
): Promise<Location.LocationGeocodedAddress[] | null> => {
  const { useCache = true, retries = 2 } = options || {};
  const cacheKey = getCacheKey(coordinates.latitude, coordinates.longitude);

  // Check cache first
  if (useCache) {
    const cached = geocodingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.address;
    }
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastGeocodingCall;
  if (timeSinceLastCall < MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - timeSinceLastCall));
  }
  lastGeocodingCall = Date.now();

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const addresses = await Location.reverseGeocodeAsync(coordinates);
      
      // Cache successful result
      if (addresses && addresses.length > 0) {
        geocodingCache.set(cacheKey, { address: addresses, timestamp: Date.now() });
      }
      
      return addresses;
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Geocoding attempt ${attempt + 1} failed:`, error?.message || error);

      // Handle specific errors that shouldn't be retried
      const errorMessage = error?.message?.toLowerCase() || '';
      if (
        errorMessage.includes('unavailable') ||
        errorMessage.includes('502') ||
        errorMessage.includes('bad gateway') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('rate limit')
      ) {
        console.warn('⚠️ Geocoding service unavailable, skipping retries');
        break;
      }

      // Wait before retry with exponential backoff
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // Log final error
  if (lastError) {
    console.error('❌ Reverse geocoding failed after retries:', lastError?.message || lastError);
  }

  return null;
};

/**
 * Get a simple address string from coordinates
 * Returns a fallback if geocoding fails
 */
export const getAddressFromCoordinates = async (
  coordinates: { latitude: number; longitude: number },
  fallback?: string
): Promise<string> => {
  // Generate a coordinate-based fallback
  const coordFallback = fallback || `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
  
  try {
    const addresses = await safeReverseGeocodeAsync(coordinates);
    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const parts = [
        address.street,
        address.district,
        address.city,
        address.region,
      ].filter(Boolean);

      return parts.length > 0 ? parts.join(', ') : coordFallback;
    }
  } catch (error) {
    // Silent fail - geocoding errors are already logged
  }

  return coordFallback;
};

/**
 * Check if geocoding is available (cached result)
 */
let geocodingAvailableCache: { available: boolean; timestamp: number } | null = null;
const AVAILABILITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const isGeocodingAvailable = async (): Promise<boolean> => {
  // Return cached result if fresh
  if (geocodingAvailableCache && Date.now() - geocodingAvailableCache.timestamp < AVAILABILITY_CACHE_TTL) {
    return geocodingAvailableCache.available;
  }

  try {
    // Try a test geocoding request with a known location
    const testCoordinates = { latitude: 10.8231, longitude: 106.6297 }; // Ho Chi Minh City
    const result = await safeReverseGeocodeAsync(testCoordinates, { useCache: false, retries: 0 });
    const available = result !== null && result.length > 0;
    
    geocodingAvailableCache = { available, timestamp: Date.now() };
    return available;
  } catch {
    geocodingAvailableCache = { available: false, timestamp: Date.now() };
    return false;
  }
};

/**
 * Clear geocoding cache
 */
export const clearGeocodingCache = (): void => {
  geocodingCache.clear();
  geocodingAvailableCache = null;
};
