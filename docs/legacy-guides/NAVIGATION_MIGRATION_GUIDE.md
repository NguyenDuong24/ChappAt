# 🗺️ Navigation Path Migration Guide

## Quick Reference: Old vs New Paths

| Old Path | New Path |
|----------|----------|
| `/CallScreen` | `/(screens)/call/CallScreen` |
| `/IncomingCallScreen` | `/(screens)/call/IncomingCallScreen` |
| `/ListenCallAcceptedScreen` | `/(screens)/call/ListenCallAcceptedScreen` |  
| `/UserProfileScreen` | `/(screens)/user/UserProfileScreen` |
| `/ProfileEditScreen` | `/(screens)/user/ProfileEditScreen` |
| `/PostDetailScreen` | `/(screens)/social/PostDetailScreen` |
| `/HashtagScreen` | `/(screens)/social/HashtagScreen` |
| `/NotificationsScreen` | `/(screens)/social/NotificationsScreen` |
| `/CoinWalletScreen` | `/(screens)/wallet/CoinWalletScreen` |
| `/HotSpotsScreen` | `/(screens)/hotspots/HotSpotsScreen` |
| `/HotSpotDetailScreen` | `/(screens)/hotspots/HotSpotDetailScreen` |
| `/HotSpotChatScreen` | `/(screens)/hotspots/HotSpotChatScreen` |
| `/GroupManagementScreen` | `/(screens)/groups/GroupManagementScreen` |

## Files Already Updated ✅

1. `hooks/useNewCallNavigation.js`
   - ✅ All call screen paths updated
   
2. `services/notificationNavigationService.ts`
   - ✅ UserProfileScreen paths
   - ✅ NotificationsScreen paths
   - ✅ PostDetailScreen paths
   - ✅ IncomingCallScreen paths
   - ✅ Added navigateToNotifications() method

3. `components/common/CoinHeader.tsx`
   - ✅ CoinWalletScreen path

## Files Needing Updates 🔧

Run these commands to find files that need updating:

```powershell
# Find all files with old UserProfileScreen references
Select-String -Path "app\**\*.tsx","app\**\*.ts","app\**\*.jsx","app\**\*.js","components\**\*.tsx","components\**\*.ts" -Pattern "'/UserProfileScreen" -Exclude "*node_modules*"

# Find all files with old HashtagScreen references  
Select-String -Path "app\**\*.tsx","app\**\*.ts","components\**\*.tsx","components\**\*.ts" -Pattern "'/HashtagScreen" -Exclude "*node_modules*"

# Find all files with old PostDetailScreen references
Select-String -Path "app\**\*.tsx","app\**\*.ts","components\**\*.tsx","components\**\*.ts" -Pattern "'/PostDetailScreen" -Exclude "*node_modules*"

# Find all files with old CoinWalletScreen references
Select-String -Path "app\**\*.tsx","app\**\*.ts","components\**\*.tsx","components\**\*.ts" -Pattern "'/CoinWalletScreen" -Exclude "*node_modules*"
```

## Common Update Patterns

### Pattern 1: Simple router.push
**Before:**
```typescript
router.push('/UserProfileScreen')
```

**After:**
```typescript
router.push('/(screens)/user/UserProfileScreen')
```

### Pattern 2: With query parameters
**Before:**
```typescript
router.push(`/UserProfileScreen?userId=${userId}`)
```

**After:**
```typescript
router.push(`/(screens)/user/UserProfileScreen?userId=${userId}`)
```

### Pattern 3: With object syntax
**Before:**
```typescript
router.push({
  pathname: '/CoinWalletScreen',
  params: { from: 'profile' }
})
```

**After:**
```typescript
router.push({
  pathname: '/(screens)/wallet/CoinWalletScreen',
  params: { from: 'profile' }
})
```

### Pattern 4: Stack.Screen definition
**Before:**
```jsx
<Stack.Screen name="UserProfileScreen" options={{ headerShown: false }} />
```

**After:**
```jsx
<Stack.Screen name="(screens)/user/UserProfileScreen" options={{ headerShown: false }} />
```

## Search & Replace Guide

You can use VS Code or your editor's find/replace with these patterns:

### Find Pattern (Regex):
```regex
router\.push\(['"`](/UserProfileScreen[^'"`]*?)['"`]\)
```

### Replace With:
```
router.push('/(screens)/user/UserProfileScreen$1')
```

Repeat for each screen type:
- UserProfileScreen → `/(screens)/user/UserProfileScreen`
- HashtagScreen → `/(screens)/social/HashtagScreen`
- PostDetailScreen → `/(screens)/social/PostDetailScreen`
- NotificationsScreen → `/(screens)/social/NotificationsScreen`
- CoinWalletScreen → `/(screens)/wallet/CoinWalletScreen`
- CallScreen → `/(screens)/call/CallScreen`
- IncomingCallScreen → `/(screens)/call/IncomingCallScreen`

## Testing Checklist

After updating paths, test these flows:

- [ ] Navigate to user profile from notification
- [ ] Navigate to post detail from home feed
- [ ] Navigate to hashtag screen from post
- [ ] Open coin wallet from profile
- [ ] Incoming call flow
- [ ] Outgoing call flow
- [ ] Navigate to hotspot detail
- [ ] Open group management

## Rollback Plan

If something breaks, you can rollback with:

```bash
# Rollback specific file
git checkout HEAD -- path/to/file.tsx

# Rollback all changes
git reset --hard HEAD
```

## Notes

- The `(screens)` folder uses parentheses to indicate it's NOT a navigation route itself
- Expo Router will handle the nested routing automatically
- All query parameters work the same way
- Deep linking should continue to work (may need to update app.json if using custom schemes)

---

**Quick Test Command:**
```bash
# Start Metro with clean cache
npx expo start --clear
```
