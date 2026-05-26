// ─────────────────────────────────────────────────────────────────────────────
// IndiYatra — App Strings
// Single source of truth for all UI copy.
// Usage: import { APP_NAME, EMPTY, SIGNIN } from '../config/appStrings';
//
// NOTE: LEVEL_LABELS, VISIBILITY_BADGE, DIFFICULTY_STARS are kept in
// supabase.js because they depend on colour constants defined there.
// They are re-exported here so consumers have one import path.
// ─────────────────────────────────────────────────────────────────────────────
export {
  LEVEL_LABELS,
  VISIBILITY_BADGE,
  DIFFICULTY_STARS,
} from '../lib/supabase';

// ── Brand identity ────────────────────────────────────────────────────────────
export const APP_NAME       = "IndiYatra";
export const APP_TAGLINE    = "Heritage for Every Child";
export const APP_SHARE_LOGO = "🪔 IndiYatra · Heritage of Bharat";

// ── Share message defaults ────────────────────────────────────────────────────
// Tokens: {dharma} {lessons} {name}
export const DEFAULT_SHARE_MSG =
  "I've earned {dharma} Dharma Points and completed {lessons} lessons on IndiYatra! 🪔 Join me at https://indiyatra.in";

// Plain text — used for per-snippet share
export const DEFAULT_SNIPPET_SHARE_MSG =
  "I found this story. It is very exciting. You can read this and more at indiyatra.in. It has an amazing collection.";

// ── Sign-in gate messages ─────────────────────────────────────────────────────
export const SIGNIN = {
  likes:        "Sign in to see your liked snippets",
  likesBody:    "Sign in to like snippets as you learn and revisit them anytime.",
  bookmarks:    "Sign in to see your bookmarks",
  bookmarksBody:"Sign in to bookmark lessons, modules and themes to revisit later.",
  share:        "Sign in to share",
  guest:        "You're browsing as a guest. Sign in to save your display name across devices.",
  settingsSync: "Saved locally on this device. Sign in to sync across devices.",
};

// ── Empty state messages ──────────────────────────────────────────────────────
export const EMPTY = {
  likes:          "No likes yet",
  bookmarks:      "No bookmarks yet",
  lessons:        "No lessons found for this module yet.",
  snippets:       "No snippets available for this lesson yet.",
  comments:       "No comments yet. Be the first!",
  events:         "No events yet.",
  drafts:         "No tasks assigned to you yet.",
  review:         "No items waiting for review.",
  discoverTagged: "Nothing tagged yet",
  discoverBody:   (term) => `No content has been tagged with "${term}" yet.`,
  progress:       "No progress data yet — complete a lesson to see your stats here.",
  forest:         "Complete your first lesson to start growing your forest.",
};

// ── Forest tokens ─────────────────────────────────────────────────────────────
// Ordered by sort_order; matches the `tokens` DB table seed
export const FOREST_TOKENS = [
  { type: "tulsi",  icon: "🌿", label: "Tulsi",  sub: "per lesson"  },
  { type: "ashoka", icon: "🌸", label: "Ashoka", sub: "per module"  },
  { type: "lotus",  icon: "🪷", label: "Lotus",  sub: "per theme"   },
  { type: "peepal", icon: "🌳", label: "Peepal", sub: "per level"   },
  { type: "banyan", icon: "🌲", label: "Banyan", sub: "per course"  },
  { type: "dharma", icon: "✦",  label: "Dharma", sub: "per point"   },
];

// Admin token-catalogue display list (plant tokens only, no dharma)
export const FOREST_TOKEN_TYPES = [
  { key: "tulsi",  label: "Tulsi",  icon: "🌿" },
  { key: "ashoka", label: "Ashoka", icon: "🌸" },
  { key: "lotus",  label: "Lotus",  icon: "🪷" },
  { key: "peepal", label: "Peepal", icon: "🌳" },
  { key: "banyan", label: "Banyan", icon: "🌲" },
  { key: "dharma", label: "Dharma", icon: "✦"  },
];
