# Task: Fix DiscoverPage — waterfall fetch, race condition, error handling

**File:** `src/pages/DiscoverPage.jsx`
**Also touch:** `src/lib/supabase.js`

---

## Problem

When a user selects a topic pill on the Discover page, content sometimes fails to load, shows stale results from the previously selected term, or spins forever with no error message.

---

## Diagnosis

### 1. Unnecessary two-step waterfall fetch

The page uses two chained `useEffect`s and an intermediate `rawMappings` state:

- **Effect 2** (fires on `selectedTerm`): fetches `content_taxonomy_mapping` → stores into `rawMappings`
- **Effect 3** (fires on `rawMappings`): fetches actual snippet/lesson/module/course details

This means every term selection costs two sequential round trips to Supabase. Since the mapping is static (not user-specific), this split is unnecessary. The IDs and the details can be fetched in the same effect with `Promise.all`.

### 2. Race condition — stale data on fast term switching

`rawMappings` is never cleared at the start of a new load. If the user clicks Term A (results load into `rawMappings`), then clicks Term B, `rawMappings` still holds Term A's data. If Term B's mapping fetch is cancelled by a rapid third click, `rawMappings` never updates, Effect 3 never re-runs, and `loading` stays `true` forever while the wrong data sits in state.

### 3. No error handling — infinite spinner on network failure

Neither `loadMappings` nor `fetchDetails` has a `try/catch`. If `supabase()` throws (network error, timeout, etc.), `setLoading(false)` is never called and the skeleton shimmer spins forever.

### 4. `supabase()` swallows API errors silently

`src/lib/supabase.js` calls `res.json()` without checking `res.ok`. A 4xx from PostgREST (bad column name, missing table, etc.) returns a JSON error object, which the `Array.isArray()` guards silently treat as empty data. Errors are invisible in the UI and hard to debug.

---

## Fix

### `src/lib/supabase.js` — check `res.ok` before parsing

```js
export async function supabase(table, query = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Supabase error [${res.status}] on ${table}:`, err);
    return [];
  }
  return res.json();
}
```

### `src/pages/DiscoverPage.jsx` — collapse to a single effect, add error handling

Remove the `rawMappings` state and Effect 3 entirely. Replace Effects 2+3 with one effect:

```js
const [results, setResults] = useState({ snippets: [], lessons: [], modules: [], courses: [] });
const [loading, setLoading]  = useState(false);

useEffect(() => {
  if (!selectedTerm) {
    setResults({ snippets: [], lessons: [], modules: [], courses: [] });
    setLoading(false);
    return;
  }
  let cancelled = false;

  async function load() {
    setLoading(true);
    try {
      const mappings = await supabase("content_taxonomy_mapping",
        "?term_id=eq." + selectedTerm + "&select=entity_id,entity_type");
      const rows = Array.isArray(mappings) ? mappings : [];

      function ids(type) {
        return rows.filter(m => m.entity_type === type).map(m => m.entity_id);
      }

      const snippetIds = ids("snippet");
      const lessonIds  = ids("lesson");
      const moduleIds  = ids("module");
      const courseIds  = ids("course");
      const langCode   = settings?.languageCode || DEFAULT_LANG_CODE;

      const [snips, lessons, modules, courses] = await Promise.all([
        snippetIds.length
          ? supabase("snippet_translations",
              "?language=eq." + langCode +
              "&snippet_id=in.(" + snippetIds.join(",") + ")&select=snippet_id,hook")
          : Promise.resolve([]),
        lessonIds.length
          ? supabase("lessons",
              "?lesson_id=in.(" + lessonIds.join(",") + ")&select=lesson_id,lesson_name,module_id")
          : Promise.resolve([]),
        moduleIds.length
          ? supabase("modules",
              "?module_id=in.(" + moduleIds.join(",") + ")&select=module_id,module_name,level_id,theme_id,course_id")
          : Promise.resolve([]),
        courseIds.length
          ? supabase("courses",
              "?course_id=in.(" + courseIds.join(",") + ")&select=course_id,course_name")
          : Promise.resolve([]),
      ]);

      if (!cancelled) {
        setResults({
          snippets: Array.isArray(snips)   ? snips   : [],
          lessons:  Array.isArray(lessons)  ? lessons  : [],
          modules:  Array.isArray(modules)  ? modules  : [],
          courses:  Array.isArray(courses)  ? courses  : [],
        });
        setLoading(false);
      }
    } catch (e) {
      console.error("DiscoverPage load error:", e);
      if (!cancelled) setLoading(false);
    }
  }

  load();
  return () => { cancelled = true; };
}, [selectedTerm, settings?.languageCode]);
```

Also **delete**:
- `const [rawMappings, setRawMappings] = useState([]);`
- The entire second `useEffect` that depends on `rawMappings`

---

## Expected outcome

- One round trip to Supabase per term selection instead of two
- No stale data when switching terms quickly
- Network errors surface in console and stop the spinner gracefully
- API errors from PostgREST are logged instead of silently swallowed
