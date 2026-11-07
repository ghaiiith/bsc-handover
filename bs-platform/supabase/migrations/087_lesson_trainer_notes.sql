-- Report BS-31: a trainer-only rich-text box on every lesson.
-- Report BS-30: the AI slide deck saved as a replaceable lesson asset.
--
-- content_html is student-facing and already carries the bilingual lesson
-- description JSON, so the trainer notes need their own column.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS trainer_notes_html text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slides_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slides_name text;

COMMENT ON COLUMN lessons.trainer_notes_html IS
  'Trainer-only notes/transcript (report BS-31). Never sent to students — see sanitizeLessonForViewer / stripTrainerOnlyFields.';
COMMENT ON COLUMN lessons.slides_url IS
  'AI-generated or manually uploaded slide deck for this lesson (report BS-30).';
