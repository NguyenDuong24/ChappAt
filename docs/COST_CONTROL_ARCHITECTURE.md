# Chat, Call, Post Cost Controls

This app now treats Firebase and VideoSDK as metered infrastructure.

## Calls

- The Expo client no longer creates VideoSDK rooms with an `EXPO_PUBLIC_*` token.
- `POST /api/videosdk/rooms` creates rooms on `saigondating-server` after Firebase auth.
- `GET /api/videosdk/token?roomId=...` only returns a join token after the server verifies the
  authenticated user can access that room.
- Server-side controls:
  - daily room/call quota per user
  - call creation cooldown
  - per-user rate limits for token and room creation
  - idempotency key required for production write endpoints
  - self-call and block relationship checks
  - short-lived room-create token kept on the server
  - short-lived, room-scoped join-only token returned to the app
  - max call duration policy written to each call document for client enforcement
- Keep `VIDEOSDK_API_KEY` and `VIDEOSDK_SECRET_KEY` only in the backend environment.
- Rotate VideoSDK keys if they ever appeared in source, logs, screenshots, or chat.

## Chat

- Chat opens with a bounded initial page.
- Realtime listens only to the recent tail of a room, not the entire conversation.
- Read/delivered receipt writes are capped per pass.
- Chat images are resized/compressed before upload.
- Storage rules reject oversized media uploads.

## Posts

- Feed/trending queries use bounded pages and candidate sets.
- New comments are written to `posts/{postId}/comments`.
- `commentsCount` and `likesCount` keep feed cards cheap.
- Post documents should stay small: content <= 3000 chars and max 4 images.

## Firestore Shape

```text
rooms/{roomId}
rooms/{roomId}/messages/{messageId}

calls/{callId}
call_usage/{uid_yyyy-mm-dd}
video_rooms/{roomId}

posts/{postId}
posts/{postId}/comments/{commentId}
```

Deploy order:

1. Deploy `saigondating-server` with VideoSDK env vars.
2. Deploy Firestore and Storage rules.
3. Release the Expo app build that uses `/api/videosdk/rooms`.
