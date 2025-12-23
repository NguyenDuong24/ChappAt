# Vibe Expiration Feature

This feature implements 24-hour expiration for user vibes, similar to Facebook Stories.

## How it works

1. **Automatic Expiration**: Vibes automatically expire after 24 hours from their `createdAt` timestamp
2. **Cache Management**: The UserContext automatically filters out expired vibes when fetching user data
3. **Real-time Updates**: Components can track expiration status in real-time using the `useVibeExpiration` hook

## Implementation Details

### UserContext Changes

The `UserContext` has been updated with:
- **Expiration Check**: All user info retrieval now checks if vibes have expired
- **Cache Cleanup**: Automatic cleanup of expired vibes every hour
- **New Functions**:
  - `cleanExpiredVibes()`: Manually clean expired vibes from cache
  - `getVibeTimeRemaining(vibe)`: Get remaining time in hours for a vibe

### Usage Examples

#### 1. Using UserContext

```tsx
import { useUserContext } from '@/context/UserContext';

const MyComponent = () => {
  const { getUserInfo, getVibeTimeRemaining } = useUserContext();
  
  const checkUserVibe = async (userId: string) => {
    const userInfo = await getUserInfo(userId);
    
    if (userInfo?.currentVibe) {
      const timeRemaining = getVibeTimeRemaining(userInfo.currentVibe);
      console.log(`Vibe expires in ${timeRemaining.toFixed(1)} hours`);
    } else {
      console.log('No active vibe');
    }
  };
};
```

#### 2. Using the Expiration Hook

```tsx
import { useVibeExpiration } from '@/hooks/useVibeExpiration';

const VibeComponent = ({ userVibe }) => {
  const { 
    isExpired, 
    formattedTimeRemaining, 
    hoursRemaining 
  } = useVibeExpiration(userVibe);

  if (isExpired) {
    return <Text>Vibe has expired</Text>;
  }

  return (
    <View>
      <Text>{userVibe.vibe.name}</Text>
      <Text>Expires in: {formattedTimeRemaining}</Text>
      {hoursRemaining < 2 && (
        <Text style={{ color: 'orange' }}>Expiring soon!</Text>
      )}
    </View>
  );
};
```

#### 3. Using the VibeDisplay Component

```tsx
import { VibeDisplay } from '@/components/VibeDisplay';

const UserProfile = ({ user }) => {
  return (
    <View>
      <Text>{user.username}</Text>
      <VibeDisplay 
        vibe={user.currentVibe} 
        showTimeRemaining={true} 
      />
    </View>
  );
};
```

## Features

### Automatic Cleanup
- Runs every hour to clean expired vibes from cache
- Updates user info objects to have `currentVibe: null` for expired vibes

### Real-time Tracking
- `useVibeExpiration` hook updates every minute by default
- Can customize update interval
- Shows exact time remaining (hours and minutes)
- Indicates when vibes are expiring soon (< 2 hours)

### Visual Indicators
- `VibeDisplay` component changes appearance when vibe is expiring soon
- Shows "Expired" status when vibe is no longer valid
- Customizable styling for different states

## Data Structure

Your Firebase user document should have this structure:

```javascript
{
  uid: "user123",
  username: "User Name",
  currentVibe: {
    id: "vibe_id",
    userId: "user123",
    vibeId: "happy",
    vibe: {
      id: "happy",
      name: "Vui vẻ",
      emoji: "😊",
      color: "#FFD700",
      description: "Tôi đang rất vui và tích cực!",
      category: "mood"
    },
    customMessage: "Hôm nay tôi vui",
    createdAt: /* Firebase Timestamp */,
    isActive: true
  }
}
```

## Configuration

### Update Intervals
- Cache cleanup: Every hour (3,600,000 ms)
- Vibe expiration tracking: Every minute (60,000 ms) - customizable
- Expiration time: 24 hours (86,400,000 ms)

### Warning Thresholds
- "Expiring soon" warning: < 2 hours remaining
- Visual indicators change when < 2 hours remaining

## Best Practices

1. **Use the Context**: Always use `useUserContext()` to get user info, it automatically filters expired vibes
2. **Real-time Updates**: Use `useVibeExpiration` hook in components that show vibe status
3. **Manual Cleanup**: Call `cleanExpiredVibes()` after user actions that might affect vibes
4. **Performance**: The automatic cleanup runs hourly to balance performance and accuracy

## Migration Notes

If you have existing vibes without proper `createdAt` timestamps, they will be considered expired. Make sure all vibes have valid `createdAt` fields before implementing this feature.
