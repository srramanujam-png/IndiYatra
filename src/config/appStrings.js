// IndiYatra -- App Strings
// Single source of truth for all UI copy.
// Usage: import { APP_NAME, EMPTY, SIGNIN } from '../config/appStrings';
//
// NOTE: LEVEL_LABELS, VISIBILITY_BADGE, DIFFICULTY_STARS are kept in
// supabase.js because they depend on colour constants defined there.
// They are re-exported here so consumers have one import path.

export {
  LEVEL_LABELS,
  VISIBILITY_BADGE,
  DIFFICULTY_STARS,
} from '../lib/supabase';

// -- Brand identity ----------------------------------------------------------
export const APP_NAME       = "IndiYatra";
export const APP_TAGLINE    = "Heritage for Every Child";
export const APP_SHARE_LOGO = "IndiYatra · Heritage of Bharat";
export const APP_URL        = "https://indiyatra.in";

// Composed footer line -- used in page footers
export const APP_FOOTER = (year) => `© ${year} ${APP_NAME} · ${APP_TAGLINE}`;

// -- Auth modal copy ---------------------------------------------------------
export const AUTH = {
  signinSubtitle:  "Sign in to continue your Yatra",
  signupSubtitle:  "Create your account",
  continueGoogle:  "Continue with Google",
  continueGuest:   "Continue as Guest",
  createAccount:   "Create an account",
  alreadyHave:     "Already have an account?",
  newHere:         "New here?",
  signIn:          "Sign In",
  createAccountCta:"Create Account",
  pleaseWait:      "Please wait…",
};

// -- Share message defaults --------------------------------------------------
// Tokens: {name} {snippets} {lessons} {quizzes} {score} {dharma} {trees}
// Option 1 — with quiz score
export const DEFAULT_SHARE_MSG_WITH_SCORE =
  `IndiYatra is a wonderful learning app for Indian Heritage, History and Culture. I have read {snippets} stories and completed {lessons} lessons. I have tried {quizzes} quizzes. My average score is {score}.\n\nEverytime I learn, I win seeds and plants and my forest of knowledge grows. I have sown {dharma} dharma seeds and my forest has {trees} thriving trees. Try yourself at learn.indiyatra.in`;

// Option 2 — without quiz score
export const DEFAULT_SHARE_MSG_NO_SCORE =
  `IndiYatra is a wonderful learning app for Indian Heritage, History and Culture. I have read {snippets} stories and completed {lessons} lessons. I have tried {quizzes} quizzes.\n\nEverytime I learn, I win seeds and plants and my forest of knowledge grows. I have sown {dharma} dharma seeds and my forest has {trees} thriving trees. Try yourself at learn.indiyatra.in`;

// Alias — used by existing code that imports DEFAULT_SHARE_MSG
export const DEFAULT_SHARE_MSG = DEFAULT_SHARE_MSG_WITH_SCORE;

// Plain text -- used for per-snippet share
export const DEFAULT_SNIPPET_SHARE_MSG =
  `I found this story. It is very exciting. You can read this and more at ${APP_URL}. It has an amazing collection.`;

// -- Sign-in gate messages ---------------------------------------------------
export const SIGNIN = {
  likes:           "Sign in to see your liked snippets",
  likesBody:       "Sign in to like snippets as you learn and revisit them anytime.",
  bookmarks:       "Sign in to see your bookmarks",
  bookmarksBody:   "Sign in to bookmark lessons, modules and themes to revisit later.",
  share:           "Sign in to share",
  guest:           "You're browsing as a guest. Sign in to save your display name across devices.",
  settingsSync:    "Saved locally on this device. Sign in to sync across devices.",
  likeTooltip:     "Sign in to like",
  bookmarkTooltip: "Sign in to bookmark",
};

// -- Empty state messages ----------------------------------------------------
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
  progress:       "No progress data yet -- complete a lesson to see your stats here.",
  forest:         "Complete your first lesson to start growing your forest.",
  editorContent:  "No content matches your filters.",
  editorTasks:    "No tasks match your filters.",
};

// -- Fallback / placeholder content ------------------------------------------
export const FALLBACK = {
  courseName:  "Bharat Heritage",
  courseDesc:  "Explore the rich heritage of Bharat through stories, art, and wisdom.",
  themeDesc:   "Explore modules in this theme.",
  moduleDesc:  "Explore the modules below.",
  snippetHook: "Discover the stories of Bharat.",
};

// -- Player / snippet labels -------------------------------------------------
export const PLAYER = {
  discoverComplete: "Discover Playlist Complete",
  likesComplete:    "End of Likes Playlist",
  dharmaPoints:     "Dharma Points",
  unlikeTooltip:    "Unlike",
  removeBookmark:   "Remove bookmark",
  addBookmark:      "Bookmark this snippet",
};

// -- Playlist labels (used in App.jsx) ---------------------------------------
export const PLAYLIST = {
  likes:   "♥ Likes Playlist",
  gateway: APP_NAME,
};

// -- Forest tokens -----------------------------------------------------------
// Ordered by sort_order; matches the `tokens` DB table seed
export const FOREST_TOKENS = [
  { type: "tulsi",  icon: "🌿", label: "Tulsi",  sub: "per lesson"  },
  { type: "ashoka", icon: "🌸", label: "Ashoka", sub: "per module"  },
  { type: "lotus",  icon: "🪷", label: "Lotus",  sub: "per theme"   },
  { type: "peepal", icon: "🌳", label: "Peepal", sub: "per level"   },
  { type: "banyan", icon: "🌲", label: "Banyan", sub: "per course"  },
  { type: "dharma", icon: "✦",     label: "Dharma", sub: "per point"   },
];

// Admin token-catalogue display list
export const FOREST_TOKEN_TYPES = [
  { key: "tulsi",  label: "Tulsi",  icon: "🌿" },
  { key: "ashoka", label: "Ashoka", icon: "🌸" },
  { key: "lotus",  label: "Lotus",  icon: "🪷" },
  { key: "peepal", label: "Peepal", icon: "🌳" },
  { key: "banyan", label: "Banyan", icon: "🌲" },
  { key: "dharma", label: "Dharma", icon: "✦"     },
];

// -- Gateway page copy -------------------------------------------------------
export const GATEWAY = {
  welcomePill:   "Welcome to IndiYatra",
  heroHeadline:  "Stories of India’s Heritage, History & Festivals.",
  heroSubtitle:  "Bite-sized multilingual snippets, curated learning paths, and fresh stories tied to India’s festivals — explore India’s rich culture at your own pace.",
  featuredTag:   "Featured Snippet",
  swipeMore:     "Swipe through more snippets →",
  exploreTitle:  "How would you like to explore?",
  features: [
    { icon: "ti-language",       title: "Multilingual snippets",  desc: "Learn in Hindi, English, Tamil, Bengali and more." },
    { icon: "ti-books",          title: "Structured courses",      desc: "Follow a curated learning path, step by step."    },
    { icon: "ti-calendar-event", title: "Every festive day",       desc: "Fresh content tied to India’s festivals and seasons." },
  ],
  choices: [
    { icon: "ti-books",    title: "Follow a Course",        sub: "Structured learning, step by step",      accentVar: "HERITAGE" },
    { icon: "ti-compass",  title: "Explore Your Interests", sub: "Browse themes and topics",               accentVar: "GREEN"    },
    { icon: "ti-heart",    title: "Most Liked",             sub: "Community’s favourite snippets",    accentVar: "RED"      },
    { icon: "ti-bookmark", title: "Most Saved",             sub: "Most bookmarked by learners",            accentVar: "SAFFRON"  },
  ],
  surpriseTitle: "Surprise Me",
  surpriseSub:   "Random snippets — keep exploring",
  surpriseCta:   "Let’s go",
};
