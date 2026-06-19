-- ============================================================
-- taxonomy_seed_consolidated.sql
-- Run this to refresh all 79 tags + 13 categories in one shot.
-- Safe to re-run: ON CONFLICT DO UPDATE.
-- ============================================================

-- Step 1: 79 tags (TERM_001 – TERM_079)
-- ============================================================
-- taxonomy_terms_seed.sql
-- 79 tags from the IndiYatra / Encyclopaedia of Hinduism masterlist.
-- Safe to re-run: ON CONFLICT DO UPDATE.
-- ============================================================

INSERT INTO taxonomy_terms (term_id, name, type, slug) VALUES
  ('TERM_001', 'Aesthetics', 'tag', 'aesthetics'),
  ('TERM_002', 'Animals', 'tag', 'animals'),
  ('TERM_003', 'Archaeology', 'tag', 'archaeology'),
  ('TERM_004', 'Architecture', 'tag', 'architecture'),
  ('TERM_005', 'Arts and Crafts', 'tag', 'arts-and-crafts'),
  ('TERM_006', 'Ashramas', 'tag', 'ashramas'),
  ('TERM_007', 'Astrology/Astrologers', 'tag', 'astrology-astrologers'),
  ('TERM_008', 'Astronomy and Cosmology', 'tag', 'astronomy-and-cosmology'),
  ('TERM_009', 'Battles/Weaponry', 'tag', 'battles-weaponry'),
  ('TERM_010', 'Bhaktas', 'tag', 'bhaktas'),
  ('TERM_011', 'Books', 'tag', 'books'),
  ('TERM_012', 'Buddhism', 'tag', 'buddhism'),
  ('TERM_013', 'Caves', 'tag', 'caves'),
  ('TERM_014', 'Concept', 'tag', 'concept'),
  ('TERM_015', 'Dance', 'tag', 'dance'),
  ('TERM_016', 'Dharmasastras', 'tag', 'dharmasastras'),
  ('TERM_017', 'Drama', 'tag', 'drama'),
  ('TERM_018', 'Dynasties', 'tag', 'dynasties'),
  ('TERM_019', 'Education', 'tag', 'education'),
  ('TERM_020', 'Festivals', 'tag', 'festivals'),
  ('TERM_021', 'Folk Arts and Crafts', 'tag', 'folk-arts-and-crafts'),
  ('TERM_022', 'Folk Dance and Music', 'tag', 'folk-dance-and-music'),
  ('TERM_023', 'Folk Literature', 'tag', 'folk-literature'),
  ('TERM_024', 'Folk Music', 'tag', 'folk-music'),
  ('TERM_025', 'Fruits and Flowers', 'tag', 'fruits-and-flowers'),
  ('TERM_026', 'Geography', 'tag', 'geography'),
  ('TERM_027', 'Gods and Goddesses', 'tag', 'gods-and-goddesses'),
  ('TERM_028', 'Grammar', 'tag', 'grammar'),
  ('TERM_029', 'Guna/Quality', 'tag', 'guna-quality'),
  ('TERM_030', 'History', 'tag', 'history'),
  ('TERM_031', 'Iconography', 'tag', 'iconography'),
  ('TERM_032', 'Indologists', 'tag', 'indologists'),
  ('TERM_033', 'Institutions/Organisations', 'tag', 'institutions-organisations'),
  ('TERM_034', 'Itihasa/Purana', 'tag', 'itihasa-purana'),
  ('TERM_035', 'Jainism', 'tag', 'jainism'),
  ('TERM_036', 'Jnana', 'tag', 'jnana'),
  ('TERM_037', 'Kings', 'tag', 'kings'),
  ('TERM_038', 'Ksetras', 'tag', 'ksetras'),
  ('TERM_039', 'Languages', 'tag', 'languages'),
  ('TERM_040', 'Law and Legislature', 'tag', 'law-and-legislature'),
  ('TERM_041', 'Libraries/Manuscripts', 'tag', 'libraries-manuscripts'),
  ('TERM_042', 'Literature', 'tag', 'literature'),
  ('TERM_043', 'Marriage', 'tag', 'marriage'),
  ('TERM_044', 'Mathas/Pithas', 'tag', 'mathas-pithas'),
  ('TERM_045', 'Mathematics', 'tag', 'mathematics'),
  ('TERM_046', 'Medicine/Ayurveda', 'tag', 'medicine-ayurveda'),
  ('TERM_047', 'Melas', 'tag', 'melas'),
  ('TERM_048', 'Mountains', 'tag', 'mountains'),
  ('TERM_049', 'Murals', 'tag', 'murals'),
  ('TERM_050', 'Music', 'tag', 'music'),
  ('TERM_051', 'Mythological Characters', 'tag', 'mythological-characters'),
  ('TERM_052', 'Oriental Institute', 'tag', 'oriental-institute'),
  ('TERM_053', 'Painting', 'tag', 'painting'),
  ('TERM_054', 'Pantha (Sects)', 'tag', 'pantha-sects'),
  ('TERM_055', 'Philosophy', 'tag', 'philosophy'),
  ('TERM_056', 'Places', 'tag', 'places'),
  ('TERM_057', 'Poetics', 'tag', 'poetics'),
  ('TERM_058', 'Polity', 'tag', 'polity'),
  ('TERM_059', 'Pramana', 'tag', 'pramana'),
  ('TERM_060', 'Races', 'tag', 'races'),
  ('TERM_061', 'Reformers', 'tag', 'reformers'),
  ('TERM_062', 'Rituals', 'tag', 'rituals'),
  ('TERM_063', 'Rivers', 'tag', 'rivers'),
  ('TERM_064', 'Rishi Muni', 'tag', 'rishi-muni'),
  ('TERM_065', 'Sampradaya', 'tag', 'sampradaya'),
  ('TERM_066', 'Samskara', 'tag', 'samskara'),
  ('TERM_067', 'Science', 'tag', 'science'),
  ('TERM_068', 'Sculpture', 'tag', 'sculpture'),
  ('TERM_069', 'Sikhism', 'tag', 'sikhism'),
  ('TERM_070', 'Sports', 'tag', 'sports'),
  ('TERM_071', 'Temples and Caves', 'tag', 'temples-and-caves'),
  ('TERM_072', 'Theatre and Cinema', 'tag', 'theatre-and-cinema'),
  ('TERM_073', 'Thinkers/Texts/Composers/Writers', 'tag', 'thinkers-texts-composers-writers'),
  ('TERM_074', 'Tirthas', 'tag', 'tirthas'),
  ('TERM_075', 'Trade and Commerce', 'tag', 'trade-and-commerce'),
  ('TERM_076', 'Warriors', 'tag', 'warriors'),
  ('TERM_077', 'Weapons/Weaponry', 'tag', 'weapons-weaponry'),
  ('TERM_078', 'Women', 'tag', 'women'),
  ('TERM_079', 'Yoga', 'tag', 'yoga')
ON CONFLICT (term_id) DO UPDATE
  SET name = EXCLUDED.name, type = EXCLUDED.type, slug = EXCLUDED.slug;

-- Total: 79 tags (TERM_001 to TERM_079)
-- Step 2: 13 broad categories (CAT_001 – CAT_013)
-- ============================================================
-- taxonomy_categories_seed.sql
-- 13 broad categories for IndiYatra content taxonomy.
-- Run AFTER taxonomy_terms_seed.sql (tags must exist first).
-- Safe to re-run: ON CONFLICT DO UPDATE.
-- ============================================================

INSERT INTO taxonomy_terms (term_id, name, type, slug) VALUES
  ('CAT_001', 'God & Theology',                    'category', 'god-and-theology'),
  ('CAT_002', 'Sacred Works',                      'category', 'sacred-works'),
  ('CAT_003', 'Philosophy & Systems',              'category', 'philosophy-and-systems'),
  ('CAT_004', 'Physical & Spiritual Well-being',   'category', 'physical-and-spiritual-well-being'),
  ('CAT_005', 'Ancient Science & Applied Systems', 'category', 'ancient-science-and-applied-systems'),
  ('CAT_006', 'Dance, Drama, Music & Festivals',   'category', 'dance-drama-music-and-festivals'),
  ('CAT_007', 'Sculpture & Architecture',          'category', 'sculpture-and-architecture'),
  ('CAT_008', 'Rishis & Gurus',                     'category', 'rishis-and-gurus'),
  ('CAT_009', 'History, Kings & Leaders',          'category', 'history-kings-and-leaders'),
  ('CAT_010', 'Pilgrimage & Regional Knowledge',   'category', 'pilgrimage-and-regional-knowledge'),
  ('CAT_011', 'Sacred Animals/Plants/Nature',       'category', 'sacred-animals-plants-nature'),
  ('CAT_012', 'Dharmic Traditions',                'category', 'dharmic-traditions'),
  ('CAT_013', 'Society & Culture',                 'category', 'society-and-culture')
ON CONFLICT (term_id) DO UPDATE
  SET name = EXCLUDED.name, type = EXCLUDED.type, slug = EXCLUDED.slug;

-- ============================================================
-- Category → Tag reference (for content tagging guidance)
-- ============================================================
-- CAT_001  God & Theology
--            TERM_027 Gods and Goddesses, TERM_014 Concept, TERM_029 Guna/Quality,
--            TERM_059 Pramana, TERM_062 Rituals
--
-- CAT_002  Sacred Works
--            TERM_011 Books, TERM_034 Itihasa/Purana, TERM_016 Dharmasastras,
--            TERM_041 Libraries/Manuscripts, TERM_042 Literature,
--            TERM_023 Folk Literature, TERM_028 Grammar, TERM_057 Poetics
--
-- CAT_003  Philosophy & Systems
--            TERM_055 Philosophy, TERM_036 Jnana, TERM_065 Sampradaya,
--            TERM_054 Pantha (Sects), TERM_014 Concept, TERM_059 Pramana
--
-- CAT_004  Physical & Spiritual Well-being
--            TERM_079 Yoga, TERM_046 Medicine/Ayurveda, TERM_006 Ashramas,
--            TERM_066 Samskara
--
-- CAT_005  Ancient Science & Applied Systems
--            TERM_067 Science, TERM_045 Mathematics, TERM_008 Astronomy and Cosmology,
--            TERM_039 Languages, TERM_028 Grammar, TERM_019 Education,
--            TERM_007 Astrology/Astrologers
--
-- CAT_006  Dance, Drama, Music & Festivals
--            TERM_015 Dance, TERM_050 Music, TERM_022 Folk Dance and Music,
--            TERM_024 Folk Music, TERM_017 Drama, TERM_072 Theatre and Cinema,
--            TERM_020 Festivals, TERM_047 Melas
--
-- CAT_007  Sculpture & Architecture
--            TERM_068 Sculpture, TERM_004 Architecture, TERM_049 Murals,
--            TERM_031 Iconography, TERM_001 Aesthetics,
--            TERM_005 Arts and Crafts, TERM_021 Folk Arts and Crafts,
--            TERM_053 Painting
--
-- CAT_008  Rishis & Gurus
--            TERM_027 Gods and Goddesses, TERM_051 Mythological Characters,
--            TERM_064 Rishi Muni, TERM_010 Bhaktas,
--            TERM_073 Thinkers/Texts/Composers/Writers, TERM_061 Reformers,
--            TERM_032 Indologists, TERM_052 Oriental Institute
--
-- CAT_009  History, Kings & Leaders
--            TERM_030 History, TERM_018 Dynasties, TERM_037 Kings,
--            TERM_076 Warriors, TERM_009 Battles/Weaponry,
--            TERM_077 Weapons/Weaponry, TERM_060 Races, TERM_058 Polity,
--            TERM_003 Archaeology
--
-- CAT_010  Pilgrimage & Regional Knowledge
--            TERM_074 Tirthas, TERM_071 Temples and Caves, TERM_038 Ksetras,
--            TERM_044 Mathas/Pithas, TERM_013 Caves, TERM_056 Places,
--            TERM_026 Geography, TERM_063 Rivers, TERM_048 Mountains
--
-- CAT_011  Sacred Animals/Plants/Nature
--            TERM_002 Animals, TERM_025 Fruits and Flowers,
--            TERM_060 Races, TERM_065 Sampradaya
--
-- CAT_012  Dharmic Traditions
--            TERM_012 Buddhism, TERM_035 Jainism, TERM_069 Sikhism
--
-- CAT_013  Society & Culture
--            TERM_043 Marriage, TERM_078 Women, TERM_070 Sports,
--            TERM_075 Trade and Commerce, TERM_040 Law and Legislature,
--            TERM_033 Institutions/Organisations
-- ============================================================
                         