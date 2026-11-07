-- 082_community_categories.sql
-- Report BS-19: make the Community categories admin-editable (add/edit from the
-- Admin Dashboard) instead of a hardcoded list. Seeded from the built-in 7 so
-- behaviour is unchanged until the admin edits them.

CREATE TABLE IF NOT EXISTS public.community_categories (
  value text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  emoji text DEFAULT '',
  keywords text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_categories_public_read" ON public.community_categories;
CREATE POLICY "community_categories_public_read" ON public.community_categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "community_categories_admin_all" ON public.community_categories;
CREATE POLICY "community_categories_admin_all" ON public.community_categories
  FOR ALL USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

INSERT INTO public.community_categories (value, label_ar, label_en, emoji, keywords, sort_order)
VALUES
  ('programming','برمجة','Programming','💻',
   ARRAY['react','node','javascript','typescript','python','java','php','laravel','django','angular','vue','next','full stack','backend','frontend','برمجة','مطور','تطوير','ويب','برنامج','software','developer','programming','c#','.net','golang','rust','api','sql','database'],0),
  ('design','تصميم','Design','🎨',
   ARRAY['design','ui','ux','figma','photoshop','illustrator','graphic','تصميم','جرافيك','واجهات','ui/ux','brand','logo','creative'],1),
  ('data','بيانات وذكاء اصطناعي','Data & AI','📊',
   ARRAY['data','ai','machine learning','ml','analytics','power bi','tableau','ذكاء اصطناعي','بيانات','تحليل','tensorflow','pandas','deep learning'],2),
  ('mobile','موبايل','Mobile','📱',
   ARRAY['mobile','flutter','react native','android','ios','swift','kotlin','موبايل','تطبيقات','app','iphone'],3),
  ('video','فيديو وميديا','Video & Media','🎬',
   ARRAY['video','editing','premiere','after effects','motion','media','فيديو','مونتاج','ميديا','animation','youtube'],4),
  ('marketing','تسويق','Marketing','📢',
   ARRAY['marketing','seo','social media','ads','google ads','content','تسويق','سوشيال','إعلانات','digital marketing','copywriting'],5),
  ('business','أعمال','Business','💰',
   ARRAY['business','management','finance','accounting','project management','أعمال','إدارة','محاسبة','مالية','hr','operations'],6)
ON CONFLICT (value) DO NOTHING;
