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
