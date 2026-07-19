# Gemini Classification Prompt
## Use this exact prompt for every batch (batch_01.csv through batch_08.csv)

---

## YOUR TASK

I am attaching a CSV file. Each row is an educational snippet about Indian history and culture. You must classify each snippet into **one category** and **2 to 5 tags** from the lists below.

Read the **hook** and **explanation** columns carefully for each row. Do not rush. Think about the primary subject of the snippet before assigning a category and tags.

---

## CATEGORIES — Pick exactly ONE per snippet

| ID | Name |
|----|------|
| CAT_001 | God & Theology |
| CAT_002 | Sacred Works |
| CAT_003 | Philosophy & Systems |
| CAT_004 | Physical & Spiritual Well-being |
| CAT_005 | Ancient Science & Applied Systems |
| CAT_006 | Dance, Drama, Music & Festivals |
| CAT_007 | Sculpture & Architecture |
| CAT_008 | Rishis & Gurus |
| CAT_009 | History, Kings & Leaders |
| CAT_010 | Pilgrimage & Regional Knowledge |
| CAT_011 | Sacred Animals/Plants/Nature |
| CAT_012 | Dharmic Traditions |
| CAT_013 | Society & Culture |

**Category guidance:**
- CAT_001 is for snippets about the *nature, attributes or theology* of God — not just any mention of a god's name
- CAT_008 is for snippets whose *primary subject* is a specific rishi, guru, bhakta saint or reformer
- CAT_009 is for snippets about battles, kings, dynasties, empires and historical events
- CAT_010 is for snippets about specific sacred places, temples, rivers, pilgrimage sites or regional geography
- CAT_012 is for snippets specifically about Buddhism, Jainism or Sikhism as traditions

---

## TAGS — Pick 2 to 5 per snippet

| ID | Name | ID | Name |
|----|------|----|------|
| TERM_001 | Aesthetics | TERM_041 | Libraries/Manuscripts |
| TERM_002 | Animals | TERM_042 | Literature |
| TERM_003 | Archaeology | TERM_043 | Marriage |
| TERM_004 | Architecture | TERM_044 | Mathas/Pithas |
| TERM_005 | Arts and Crafts | TERM_045 | Mathematics |
| TERM_006 | Ashramas | TERM_046 | Medicine/Ayurveda |
| TERM_007 | Astrology/Astrologers | TERM_047 | Melas |
| TERM_008 | Astronomy and Cosmology | TERM_048 | Mountains |
| TERM_009 | Battles/Weaponry | TERM_049 | Murals |
| TERM_010 | Bhaktas | TERM_050 | Music |
| TERM_011 | Books | TERM_051 | Mythological Characters |
| TERM_012 | Buddhism | TERM_052 | Oriental Institute |
| TERM_013 | Caves | TERM_053 | Painting |
| TERM_014 | Concept | TERM_054 | Pantha (Sects) |
| TERM_015 | Dance | TERM_055 | Philosophy |
| TERM_016 | Dharmasastras | TERM_056 | Places |
| TERM_017 | Drama | TERM_057 | Poetics |
| TERM_018 | Dynasties | TERM_058 | Polity |
| TERM_019 | Education | TERM_059 | Pramana |
| TERM_020 | Festivals | TERM_060 | Races |
| TERM_021 | Folk Arts and Crafts | TERM_061 | Reformers |
| TERM_022 | Folk Dance and Music | TERM_062 | Rituals |
| TERM_023 | Folk Literature | TERM_063 | Rivers |
| TERM_024 | Folk Music | TERM_064 | Rishi Muni |
| TERM_025 | Fruits and Flowers | TERM_065 | Sampradaya |
| TERM_026 | Geography | TERM_066 | Samskara |
| TERM_027 | Gods and Goddesses | TERM_067 | Science |
| TERM_028 | Grammar | TERM_068 | Sculpture |
| TERM_029 | Guna/Quality | TERM_069 | Sikhism |
| TERM_030 | History | TERM_070 | Sports |
| TERM_031 | Iconography | TERM_071 | Temples and Caves |
| TERM_032 | Indologists | TERM_072 | Theatre and Cinema |
| TERM_033 | Institutions/Organisations | TERM_073 | Thinkers/Texts/Composers/Writers |
| TERM_034 | Itihasa/Purana | TERM_074 | Tirthas |
| TERM_035 | Jainism | TERM_075 | Trade and Commerce |
| TERM_036 | Jnana | TERM_076 | Warriors |
| TERM_037 | Kings | TERM_077 | Weapons/Weaponry |
| TERM_038 | Ksetras | TERM_078 | Women |
| TERM_039 | Languages | TERM_079 | Yoga |
| TERM_040 | Law and Legislature | | |

---

## OUTPUT FORMAT — Follow this exactly

Return a CSV block with these four columns and nothing else:

```
snippet_key,category_id,tag_ids,notes
```

- **snippet_key** — copy exactly from the input, no changes
- **category_id** — one value, e.g. `CAT_009`
- **tag_ids** — 2 to 5 values separated by a pipe character `|`, e.g. `TERM_027|TERM_062|TERM_071`
- **notes** — one short sentence explaining your category choice (this helps with quality review)

**Example output row:**
```
283,CAT_012,TERM_012|TERM_064|TERM_019|TERM_056,"Buddha's names — primary subject is Buddhism and the biography of the Buddha"
```

---

## RULES

1. Use **only** the IDs from the lists above. Do not invent new ones.
2. Every row in the input must appear in the output — do not skip any.
3. Do not merge rows or change snippet_key values.
4. If you are unsure between two categories, pick the one that best describes the **primary subject** of the explanation, not just a passing mention.
5. Tags should reflect what a learner would search for to find this snippet. Pick the most specific tags first.
6. **Do NOT use TERM_014 (Concept) or TERM_073 (Thinkers/Texts/Composers/Writers) as generic fallback tags.** Only use TERM_014 if the snippet is specifically explaining an abstract philosophical concept as its main subject. Only use TERM_073 if the snippet is specifically about a named thinker, composer or writer as the primary focus.
7. **Aim for 3–4 tags per row, not 2.** If you have only 2, look harder — there is almost always a third specific tag that applies.
8. For snippets about a **specific person** (reformer, king, saint, guru), always add at least one tag for the *era or context* they operated in — e.g. TERM_030 (History), TERM_018 (Dynasties), TERM_056 (Places), or TERM_078 (Women). For snippets about a **specific place or temple**, always add at least one tag for the *type of content* — e.g. TERM_062 (Rituals), TERM_034 (Itihasa/Purana), TERM_027 (Gods and Goddesses), or TERM_030 (History).
9. Work through the rows **in order**, one at a time. Do not batch your thinking.

---

## COUNT CHECK — Required after the CSV block

After outputting the CSV, add these two lines:

```
COUNT CHECK: Input rows = X | Output rows = Y | Missing = Z
Missing keys: [list any snippet_keys you skipped, or "none"]
```

Count the data rows in the input file (excluding the header). Count the data rows you produced (excluding the header). If the numbers differ, list every missing snippet_key so they can be sent back for a follow-up run.

---

## BEGIN

Please classify the snippets in the attached CSV file now.
