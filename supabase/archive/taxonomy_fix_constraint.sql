-- ============================================================
-- taxonomy_fix_constraint.sql
-- The CHECK constraint on content_taxonomy_mapping.entity_type
-- was created before the rename and has a too-narrow allowed list.
-- Drop it and replace with one covering all content types.
-- Then re-run the seed inserts.
-- Run this INSTEAD OF taxonomy_seed.sql (it includes the seed).
-- ============================================================

-- 1. Drop the old check constraint (name kept the original table name)
ALTER TABLE content_taxonomy_mapping
  DROP CONSTRAINT IF EXISTS snippet_taxonomy_mapping_entity_type_check;

-- 2. Add the correct constraint covering all entity types
ALTER TABLE content_taxonomy_mapping
  ADD CONSTRAINT content_taxonomy_mapping_entity_type_check
  CHECK (entity_type IN ('snippet', 'lesson', 'module', 'theme', 'course'));

-- 3. Seed sample mappings
INSERT INTO content_taxonomy_mapping (term_id, entity_id, entity_type) VALUES

-- Snippets
('TERM_005', 'SNIP_00001', 'snippet'),
('TERM_010', 'SNIP_00001', 'snippet'),
('TERM_002', 'SNIP_00002', 'snippet'),
('TERM_006', 'SNIP_00002', 'snippet'),
('TERM_001', 'SNIP_00003', 'snippet'),
('TERM_010', 'SNIP_00004', 'snippet'),
('TERM_008', 'SNIP_00005', 'snippet'),
('TERM_009', 'SNIP_00006', 'snippet'),
('TERM_007', 'SNIP_00006', 'snippet'),

-- Lessons
('TERM_004', 'LESSON_010', 'lesson'),
('TERM_004', 'LESSON_011', 'lesson'),
('TERM_004', 'LESSON_009', 'lesson'),
('TERM_006', 'LESSON_004', 'lesson'),
('TERM_006', 'LESSON_005', 'lesson'),
('TERM_002', 'LESSON_007', 'lesson'),
('TERM_001', 'LESSON_001', 'lesson'),

-- Modules
('TERM_004', 'MOD_004', 'module'),
('TERM_005', 'MOD_005', 'module'),
('TERM_002', 'MOD_001', 'module'),
('TERM_006', 'MOD_002', 'module'),

-- Course
('TERM_001', 'Course_001', 'course')

ON CONFLICT DO NOTHING;
