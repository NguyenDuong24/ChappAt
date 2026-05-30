// ──────────────────────────────────────────────────────────────
// Production Cost & Rate Controls
// All limits are enforced BOTH client-side (UX) and server-side (security).
// ──────────────────────────────────────────────────────────────

// ── Chat ─────────────────────────────────────────────────────
export const CHAT_COST_LIMITS = {
  initialPageSize: 24,
  maxPageSize: 30,
  realtimeTailSize: 24,
  readReceiptBatchSize: 30,
  // Anti-spam: minimum gap between two consecutive messages (ms)
  minSendIntervalMs: 1000,
  // Anti-spam: max rapid messages before temporary mute
  rapidMessageThreshold: 5,       // 5 messages in …
  rapidMessageWindowMs: 10_000,   // … 10 seconds → mute
  rapidMessageMuteMs: 30_000,     // mute for 30 seconds
  maxTextLength: 2000,
  imageMaxWidth: 1280,
  imageCompressQuality: 0.72,
};

// ── Posts ─────────────────────────────────────────────────────
export const POST_COST_LIMITS = {
  pageSize: 12,
  maxPageSize: 20,
  trendingCandidateSize: 40,
  commentsPreviewLimit: 5,
  commentPageSize: 20,
  maxCommentLength: 500,
  maxPostLength: 3000,
  maxImagesPerPost: 4,
};

// ── Calls ────────────────────────────────────────────────────
// Per-call duration: enforced on both client (CallScreen timer) and server
// (costPolicy.maxDurationSeconds written in the call doc).
//
// Daily quotas: enforced on server (call_usage collection).
// The client reads these for informational UI only.
export const CALL_COST_LIMITS = {
  ringTimeoutMs: 30_000,

  // ─ Audio call ─────────────────────────────────────
  // Free users: 20 min total audio per day (e.g. 2×10 min, 1×20 min …)
  freeDailyAudioSeconds: 20 * 60,
  // Max single audio call duration (free)
  freeMaxAudioCallSeconds: 20 * 60,

  // ─ Video call ─────────────────────────────────────
  // Free users: 5 min total video per day
  freeDailyVideoSeconds: 5 * 60,
  // Max single video call duration (free)
  freeMaxVideoCallSeconds: 5 * 60,

  // ─ Premium ────────────────────────────────────────
  premiumDailyAudioSeconds: 120 * 60,  // 2 hours
  premiumMaxAudioCallSeconds: 60 * 60, // 1 hour per call

  premiumDailyVideoSeconds: 60 * 60,   // 1 hour
  premiumMaxVideoCallSeconds: 30 * 60,  // 30 min per call

  // ─ Anti-spam / cooldown ───────────────────────────
  // Minimum gap between creating two calls (seconds)
  callCooldownSeconds: 20,
  // Max calls a free user can create per day
  freeDailyCallCount: 20,
  premiumDailyCallCount: 120,
};

// ── Ads ──────────────────────────────────────────────────────
export const AD_LIMITS = {
  // Probability of showing an interstitial when app resumes (0-1)
  interstitialResumeChance: 0.33,
  // Minimum gap between two interstitials (ms)
  interstitialCooldownMs: 3 * 60 * 1000, // 3 minutes
  // Show interstitial after N messages sent
  interstitialAfterMessages: 30,
};
