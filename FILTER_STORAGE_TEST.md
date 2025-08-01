# 🔧 TEST FILTER STORAGE

## Cách test lưu filter preferences:

### 1. Test basic storage:
```javascript
// Trong console khi chạy app:
import { loadFilterPreferences, saveFilterPreferences } from './utils/filterStorage';

// Test save
const testFilter = { gender: 'male', minAge: '25', maxAge: '35' };
await saveFilterPreferences(testFilter);

// Test load
const loaded = await loadFilterPreferences();
console.log('Loaded filter:', loaded);
```

### 2. Test scenarios:

**Scenario A - First time user:**
1. Mở app lần đầu
2. Không có filter nào được chọn
3. Console log: "📱 No saved filters found, using defaults"

**Scenario B - Apply và save filter:**
1. Chọn filter: Nam, 25-35
2. Bấm "🔍 ÁP DỤNG"
3. Console log: "✅ Filter applied and saved"
4. Console log: "💾 Filter preferences saved"

**Scenario C - Restart app:**
1. Force close app (swipe up)
2. Mở lại app
3. Console log: "📱 Loaded saved filters"
4. Console log: "🔄 Filter state restored from storage"
5. Filter UI hiển thị đúng settings đã lưu

**Scenario D - Clear filters:**
1. Bấm "Xóa bộ lọc"
2. Console log: "🗑️ Filters cleared and saved"
3. Restart app → không có filter nào

### 3. Debug commands:

```javascript
// Check AsyncStorage directly
import AsyncStorage from '@react-native-async-storage/async-storage';

// See what's stored
AsyncStorage.getItem('@user_filter_preferences').then(data => {
  console.log('Raw storage data:', data);
});

// Clear storage (for testing)
AsyncStorage.removeItem('@user_filter_preferences');
```

### 4. Expected behavior:

✅ **When app starts:**
- Load saved filters automatically
- Apply to both local state và global state
- UI reflects saved settings

✅ **When apply filters:**
- Save immediately to AsyncStorage
- Update both states
- Persist across app restarts

✅ **When clear filters:**
- Remove from AsyncStorage
- Reset all states
- Next restart có default empty filters

### 5. Storage structure:

```json
{
  "gender": "male",      // "male" | "female" | "all" | ""
  "minAge": "25",        // string number hoặc ""
  "maxAge": "35"         // string number hoặc ""
}
```

### 6. Test checklist:

- [ ] App loads saved filters on startup
- [ ] Filter badge shows correct count
- [ ] Filter preview shows correct text
- [ ] Apply saves và persists
- [ ] Clear removes và persists
- [ ] Works across app restarts
- [ ] Handles missing/corrupted data gracefully
- [ ] Console logs show correct flow

### 7. Troubleshooting:

**Problem:** Filters not loading
**Solution:** Check console for error logs, verify AsyncStorage permissions

**Problem:** Filters not saving
**Solution:** Check async/await usage, verify storage write permissions

**Problem:** UI not updating
**Solution:** Verify state management flow, check useEffect dependencies
