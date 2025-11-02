# 🧪 Quick Test Guide - Block System

## 🎯 Cách test block system

### Setup Test
Bạn cần 2 tài khoản để test:
- **User A** (account chính của bạn)
- **User B** (account test)

---

## ✅ Test UserProfileScreen

### Test 1: User A blocks User B

1. **Login as User A**
2. Vào profile của User B
3. Click button "Chặn người dùng"
4. Xác nhận → Thành công
5. Refresh page hoặc vào lại profile User B

**Kết quả mong đợi:**
```
✅ Thấy profile header của User B
⚠️ Thấy banner: "Bạn đã chặn người dùng này"
   "Bạn sẽ không thấy bài viết của họ..."
❌ KHÔNG thấy bất kỳ posts nào của User B
❌ KHÔNG thấy button "Nhắn tin" (ButtonToChat)
```

### Test 2: User B checks User A's profile (bị chặn)

1. **Login as User B**
2. Vào profile của User A

**Kết quả mong đợi:**
```
✅ Thấy profile header của User A
⚠️ Thấy banner: "Bạn đã bị chặn"
   "Bạn không thể xem bài viết của người dùng này."
❌ KHÔNG thấy profile info details
❌ KHÔNG thấy posts
❌ KHÔNG thấy action buttons
```

### Test 3: User A unblocks User B

1. **Login as User A**
2. Vào profile của User B
3. Click button "Bỏ chặn người dùng"
4. Xác nhận → Thành công
5. Refresh page

**Kết quả mong đợi:**
```
✅ Thấy profile bình thường
✅ Thấy tất cả posts của User B
✅ Thấy button "Nhắn tin"
❌ KHÔNG thấy banner cảnh báo
```

---

## ✅ Test Chat Screen

### Test 4: User A blocks User B → Try to chat

1. **Login as User A**
2. Chặn User B (nếu chưa chặn)
3. Vào Chat với User B (từ chat list hoặc profile)

**Kết quả mong đợi:**
```
✅ Thấy ChatRoomHeader
⚠️ Thấy BlockedChatView:
   🚫 "Không thể nhắn tin"
   "Bạn đã chặn người dùng này"
   "Bỏ chặn để có thể nhắn tin lại"
❌ KHÔNG thấy message list
❌ KHÔNG thấy text input
❌ KHÔNG thấy send button
❌ KHÔNG thể gửi tin nhắn
```

### Test 5: User B tries to chat with User A (bị chặn)

1. **Login as User B**
2. Vào Chat với User A

**Kết quả mong đợi:**
```
✅ Thấy ChatRoomHeader
⚠️ Thấy BlockedChatView:
   ⚠️ "Không khả dụng"
   "Bạn không thể nhắn tin với người dùng này"
❌ KHÔNG thấy message list
❌ KHÔNG thấy text input
❌ KHÔNG thấy send button
```

### Test 6: User A unblocks User B → Chat normally

1. **Login as User A**
2. Bỏ chặn User B
3. Vào Chat với User B

**Kết quả mong đợi:**
```
✅ Thấy ChatRoomHeader
✅ Thấy message list
✅ Thấy text input
✅ Thấy send button
✅ CÓ THỂ gửi tin nhắn bình thường
❌ KHÔNG thấy BlockedChatView
```

---

## 🎬 Video Demo Steps

### Scenario 1: Complete Block Flow

```
1. User A login
2. Go to User B profile
3. Click "Chặn người dùng"
4. Confirm → Success message
5. Refresh page
6. ✅ See blocked banner, no posts
7. Try to chat with User B
8. ✅ See BlockedChatView, no input
9. Click "Bỏ chặn người dùng"
10. Confirm → Success message
11. Refresh
12. ✅ Everything back to normal
```

### Scenario 2: Being Blocked

```
1. User A blocks User B
2. User B login
3. Go to User A profile
4. ✅ See "Bạn đã bị chặn" banner
5. ✅ No posts visible
6. Go to Chat with User A
7. ✅ See BlockedChatView
8. ✅ Cannot send messages
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Vẫn thấy posts sau khi chặn
**Solution:** 
- Refresh page (pull to refresh)
- Kiểm tra xem hook `useBlockStatus` đã được gọi chưa
- Check console log để xem block status

### Issue 2: Vẫn gửi tin nhắn được sau khi chặn
**Solution:**
- Kiểm tra `useChatPermission` hook
- Đảm bảo `canChat` === false
- Check Firestore blocks collection có entry không

### Issue 3: Loading state hiển thị mãi không tắt
**Solution:**
- Check network connection
- Check Firestore rules
- Xem console có lỗi gì không

### Issue 4: Banner không hiển thị
**Solution:**
- Kiểm tra `hasBlockRelation` === true
- Check styles cho banner
- Verify dark mode colors

---

## 📊 Test Checklist

### UserProfileScreen Tests
- [ ] Test 1: Block → No posts ✅
- [ ] Test 2: Being blocked → Banner correct ✅
- [ ] Test 3: Unblock → Posts appear ✅
- [ ] Test 4: Loading state shows ✅
- [ ] Test 5: Dark mode works ✅
- [ ] Test 6: ButtonToChat hidden when blocked ✅

### Chat Screen Tests
- [ ] Test 7: Block → BlockedChatView shows ✅
- [ ] Test 8: Block → No input/send button ✅
- [ ] Test 9: Being blocked → Correct message ✅
- [ ] Test 10: Unblock → Chat works ✅
- [ ] Test 11: Loading state shows ✅
- [ ] Test 12: Dark mode works ✅

---

## 🔥 Quick Commands for Testing

### Firebase Console Queries

Check if block exists:
```javascript
// In Firestore console
blocks
  .where('blockerId', '==', 'userA_uid')
  .where('blockedId', '==', 'userB_uid')
  .get()
```

Check all blocks for a user:
```javascript
// All users blocked by userA
blocks
  .where('blockerId', '==', 'userA_uid')
  .get()

// All users who blocked userA
blocks
  .where('blockedId', '==', 'userA_uid')
  .get()
```

---

## ✅ Expected Results Summary

| Action | UserProfileScreen | Chat Screen |
|--------|------------------|-------------|
| **Block** | Banner + No posts + No chat button | BlockedChatView + No input |
| **Blocked** | "Bị chặn" banner + No content | BlockedChatView + No input |
| **Unblock** | Normal view + All posts + Chat button | Normal chat + Input + Send |

---

## 🎉 If Everything Works

Bạn sẽ thấy:
- ✅ Chặn → Không thấy posts
- ✅ Chặn → Không nhắn tin được
- ✅ Banner cảnh báo rõ ràng
- ✅ UI/UX mượt mà
- ✅ Dark mode đẹp
- ✅ Loading states
- ✅ Bỏ chặn → Mọi thứ trở lại bình thường

**Perfect! Block system hoạt động 100%!** 🚀

---

## 📞 Need Help?

Nếu có vấn đề gì, check:
1. Console logs
2. Firestore blocks collection
3. Network tab
4. `BLOCK_INTEGRATION_COMPLETE.md` for details

Happy testing! 🧪✨
