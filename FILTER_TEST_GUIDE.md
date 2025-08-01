# 🧪 Filter Testing Guide

## Test Filter Functionality

### 1. **Test Setup**
- Open the app
- Go to Home tab 
- Look for the filter button (tune icon) in header
- Should see FilterDebug component (only in development)

### 2. **Test Gender Filter**
1. Tap filter button
2. Select "Nam" chip
3. Tap "Lọc kết quả" button
4. Check console logs for "🔍 Filter applied"
5. Check if only male users appear in list
6. Check FilterDebug shows gender: male

### 3. **Test Age Filter**
1. Open filter panel
2. Enter min age: 25
3. Enter max age: 35
4. Tap "Lọc kết quả"
5. Check if only users age 25-35 appear
6. Check FilterDebug shows minAge: 25, maxAge: 35

### 4. **Test Combined Filter**
1. Select gender + age range
2. Apply filter
3. Should see users matching both criteria

### 5. **Test Clear Filter**
1. Apply some filters
2. Tap "Xóa bộ lọc"
3. Should see all users again
4. FilterDebug should show empty values

### 6. **Debug Console Logs**
Look for these logs in console:
- `🔍 Getting users with filter:`
- `📝 All users before filtering:`
- `👤 [username]: age=X, gender=Y, matchesGender=true/false, matchesAge=true/false, included=true/false`
- `✅ Final filtered users: X`

### 7. **Expected Behavior**
- Filter button shows badge count when filters active
- Filter panel slides down smoothly
- Results update immediately after tapping "Lọc kết quả"
- Results counter shows "Tìm thấy X người" or "Không tìm thấy ai phù hợp"
- Active filters display as chips below header

### 8. **Troubleshooting**
If filter not working:
1. Check console logs for errors
2. Verify StateCommonProvider wraps the app
3. Check if users have age/gender data in Firebase
4. Verify filter state in FilterDebug component

### 9. **Test Data Requirements**
Make sure your Firebase users have:
```json
{
  "username": "John Doe",
  "age": 25,
  "gender": "male",
  "isOnline": true,
  "profileUrl": "...",
  "bio": "..."
}
```
