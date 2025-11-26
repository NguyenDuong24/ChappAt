# Navigation Flow Diagram

## Before Fix (Old Behavior)

```
HOME TAB (User List Data Loaded)
    │
    ├─→ Click User
    │
    ▼
USER PROFILE SCREEN
    │
    ├─→ Press Back
    │
    ▼
HOME TAB (🔴 Data Reloaded - unmounted)
```

## After Fix (New Behavior)

```
HOME TAB (User List Data Loaded)
    │
    ├─→ Click User  
    │   (router.push)
    ▼
USER PROFILE SCREEN
    │
    ├─→ Press Back
    │
    ▼
HOME TAB (✅ Same Data - still mounted)
```

## Multi-Tab Navigation Example

```
┌─────────────────────────────────────────────────────────┐
│                    APP STRUCTURE                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   HOME   │  │ EXPLORE  │  │   CHAT   │              │
│  │  (List)  │  │  (Posts) │  │  (List)  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │              │                     │
│       │             │              │                     │
│       └─────────────┼──────────────┘                    │
│                     │                                    │ 
│                     ▼                                    │
│            ┌────────────────┐                           │
│            │ USER PROFILE   │                           │
│            │    SCREEN      │                           │
│            └───────┬────────┘                           │
│                    │                                    │
│                    │ Back Button                        │
│                    ▼                                    │
│         Returns to PREVIOUS TAB                        │
│         with DATA PRESERVED                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## State Preservation Behavior

| Tab      | unmountOnBlur | Behavior When Navigate Away         |
|----------|---------------|-------------------------------------|
| Home     | `false`       | ✅ Stays mounted, data preserved    |
| Explore  | `false`       | ✅ Stays mounted, data preserved    |
| Chat     | `false`       | ✅ Stays mounted, data preserved    |
| Groups   | `false`       | ✅ Stays mounted, data preserved    |
| Profile  | `true`        | 🔄 Resets when clicking tab button  |

## Navigation Methods Comparison

### Using router.push() ✅ (Current)
```javascript
router.push({
  pathname: "/UserProfileScreen",
  params: { userId: item.id }
});

// Stack: [HomeTab] → [UserProfileScreen]
// Back button → Returns to [HomeTab] with state
```

### Using router.replace() ❌ (Wrong for this case)
```javascript
router.replace({
  pathname: "/UserProfileScreen", 
  params: { userId: item.id }
});

// Stack: [UserProfileScreen] (replaced HomeTab)
// Back button → Exits app or goes to previous screen before HomeTab
```

## Example User Journeys

### Journey 1: Home → Profile → Back
```
1. User opens app
2. Home tab shows list of 50 users
3. User scrolls to user #30
4. User clicks on user #30
5. UserProfileScreen opens
6. User views profile
7. User presses back
8. ✅ Returns to Home tab, still at user #30 position
9. ✅ No reload, data still there
```

### Journey 2: Explore → Profile → Back
```
1. User is on Explore tab
2. Viewing posts feed, scrolled down to post #15
3. User clicks on avatar in post #15
4. UserProfileScreen opens
5. User views profile
6. User presses back
7. ✅ Returns to Explore tab, still at post #15
8. ✅ Scroll position maintained
9. ✅ No reload
```

### Journey 3: Multiple Navigations
```
HOME (users 1-50)
  └→ User Profile A
      └→ BACK → HOME (still shows users 1-50)
          └→ Switch to EXPLORE  
              └→ User Profile B
                  └→ BACK → EXPLORE (data preserved)
                      └→ Switch to HOME
                          └→ Still shows users 1-50
```
