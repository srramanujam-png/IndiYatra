-- ============================================================
-- taxonomy_seed.sql
-- Seed content_taxonomy_mapping with sample mappings for testing.
-- Run AFTER rename_taxonomy_table.sql
-- ============================================================
--
-- Taxonomy terms reference:
--   TERM_001 Architecture  (Category)
--   TERM_002 Art           (Category)
--   TERM_003 Painting      (Category)
--   TERM_004 Book          (Category)
--   TERM_005 Gurus         (Category)
--   TERM_006 Rishis        (Tag)
--   TERM_007 Mountains     (Tag)
--   TERM_008 Rivers        (Tag)
--   TERM_009 Tirthas       (Tag)
--   TERM_010 Temples       (Tag)
-- ============================================================

INSERT INTO content_taxonomy_mapping (term_id, entity_id, entity_type) VALUES

-- Snippets
('TERM_005', 'SNIP_00001', 'snippet'),   -- Gurus
('TERM_010', 'SNIP_00001', 'snippet'),   -- Temples (also tagged)
('TERM_002', 'SNIP_00002', 'snippet'),   -- Art
('TERM_006', 'SNIP_00002', 'snippet'),   -- Rishis (also tagged)
('TERM_001', 'SNIP_00003', 'snippet'),   -- Architecture
('TERM_010', 'SNIP_00004', 'snippet'),   -- Temples
('TERM_008', 'SNIP_00005', 'snippet'),   -- Rivers
('TERM_009', 'SNIP_00006', 'snippet'),   -- Tirthas
('TERM_007', 'SNIP_00006', 'snippet'),   -- Mountains (also tagged)

-- Lessons
('TERM_004', 'LESSON_010', 'lesson'),    -- Book → Vedas
('TERM_004', 'LESSON_011', 'lesson'),    -- Book → Upanishads
('TERM_004', 'LESSON_009', 'lesson'),    -- Book → Scriptures (Sruti/Smriti)
('TERM_006', 'LESSON_004', 'lesson'),    -- Rishis → Santi Mantras
('TERM_006', 'LESSON_005', 'lesson'),    -- Rishis → Gayatri Mantra
('TERM_002', 'LESSON_007', 'lesson'),    -- Art → Yantras
('TERM_001', 'LESSON_001', 'lesson'),    -- Architecture → God (Proofs/Ways)

-- Modules
('TERM_004', 'MOD_004', 'module'),       -- Book → Bhagavad Gita
('TERM_005', 'MOD_005', 'module'),       -- Gurus → Bhakti
('TERM_002', 'MOD_001', 'module'),       -- Art → Animals as Avataras
('TERM_006', 'MOD_002', 'module'),       -- Rishis → Animals for morality

-- Course
('TERM_001', 'Course_001', 'course')     -- Architecture → Bharat Heritage

ON CONFLICT DO NOTHING;
