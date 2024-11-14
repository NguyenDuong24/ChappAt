// C:\ChappAt\utils\calculateDistance.js

// Haversine formula to calculate the distance between two points in kilometers
export const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180); // Convert degrees to radians
    const dLon = (lon2 - lon1) * (Math.PI / 180); // Convert degrees to radians
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
};

// Function to calculate distance between the current user and a list of other users
export const calculateDistance = (currentUserLocation, user) => {
        const distance = haversine(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            user?.latitude,
            user?.longitude
        );
        return distance;
};
