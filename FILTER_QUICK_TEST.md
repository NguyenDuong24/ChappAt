# 🧪 Quick Filter Test

## Test Steps:

### 1. Test Gender Filter
```
1. Tap filter button (tune icon)
2. Select "Nam" 
3. Tap "Lọc kết quả"
4. ✅ Should see only male users
5. Check console: "🔍 Getting users with filter: {gender: 'male'}"
```

### 2. Test Age Filter  
```
1. Open filter
2. Enter min age: 25, max age: 35
3. Tap "Lọc kết quả"
4. ✅ Should see only users aged 25-35
5. Check console: "👤 [name]: age=X, matchesAge=true/false"
```

### 3. Test Combined Filter
```
1. Select gender: "Nữ" + age: 20-30
2. Tap "Lọc kết quả"  
3. ✅ Should see only female users aged 20-30
```

### 4. Test Clear Filter
```
1. Apply any filter
2. Tap "Xóa bộ lọc"
3. ✅ Should see all users again
```

## Expected Console Output:
```
🎯 APPLYING FILTER NOW: {gender: "male", minAge: "", maxAge: ""}
📝 Previous state: {gender: "", minAge: "", maxAge: ""}
📝 New state: {gender: "male", minAge: "", maxAge: ""}
✅ Filter applied successfully! Users should update now.
🔄 Filter changed, refreshing users... {gender: "male", minAge: "", maxAge: ""}
🔍 Getting users with filter: {gender: "male", minAge: "", maxAge: ""}
📝 All users before filtering: 10
👤 John: age=25, gender=male, matchesGender=true, matchesAge=true, included=true
👤 Jane: age=22, gender=female, matchesGender=false, matchesAge=true, included=false
✅ Final filtered users: 5
```

## If Filter Not Working:
1. Check StateCommonProvider wraps App
2. Verify users have age/gender in Firebase
3. Check console logs for errors
4. Look at FilterDebug component values

## Expected UI Behavior:
- Filter badge shows count when active
- Results counter updates: "🔍 Tìm thấy X người"
- ActiveFilters chips appear below header
- "Đang lọc kết quả..." shows briefly during filter
