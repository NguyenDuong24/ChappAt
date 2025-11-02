# Vibe System Setup Instructions

## Firebase Indexes Setup

The vibe system requires specific Firestore indexes to work properly. You need to deploy them manually:

### Option 1: Using Firebase CLI (Recommended)

1. Login to Firebase CLI:
```bash
firebase login
```

2. Select your project:
```bash
firebase use --add
# Select your project: dating-app-1bb49
```

3. Deploy the indexes:
```bash
firebase deploy --only firestore:indexes
```

### Option 2: Manual Setup via Firebase Console

If CLI doesn't work, you can create the indexes manually:

1. Go to [Firebase Console](https://console.firebase.google.com/project/dating-app-1bb49/firestore/indexes)

2. Create these composite indexes for the `userVibes` collection:

**Index 1:**
- Collection: `userVibes`
- Fields:
  - `userId` (Ascending)
  - `isActive` (Ascending)  
  - `createdAt` (Descending)

**Index 2:**
- Collection: `userVibes`
- Fields:
  - `isActive` (Ascending)
  - `createdAt` (Descending)

**Index 3:**
- Collection: `userVibes`
- Fields:
  - `isActive` (Ascending)
  - `vibe.category` (Ascending)
  - `createdAt` (Descending)

## Current Status

The vibe system has been modified to work with simplified queries while the indexes are being built. The app will:

1. Show a warning message about indexes building
2. Use client-side filtering temporarily
3. Work normally once indexes are deployed

## Features Implemented

✅ **Vibe Types & System**
- 20+ predefined vibes (mood, activity, energy, romantic)
- Categories: mood, activity, energy, romantic
- Custom messages for vibes

✅ **Components**
- `VibeSelector` - Choose and set vibes
- `VibeDisplay` - Show vibe with animations
- `NearbyVibes` - Find people with vibes nearby
- `VibesScreen` - Complete vibe management screen

✅ **Integration**
- Added to TopProfile component
- Added to EditProfile screen
- Real-time subscriptions
- Location-based discovery

✅ **Services & Hooks**
- `vibeService` - Firebase operations
- `useVibe` - React hook for vibe management
- Error handling and fallbacks

## Testing

Once indexes are deployed, you can test:

1. **Set a vibe** - Tap "Add Vibe" button
2. **View nearby vibes** - See other users' vibes nearby
3. **Vibe history** - View your past vibes
4. **Statistics** - See popular vibes

## Next Steps

After indexes are built (5-10 minutes), the vibe system will work at full performance with:
- Real-time updates
- Efficient queries
- Location-based filtering
- Category filtering

The system is production-ready and optimized for a dating app experience!
