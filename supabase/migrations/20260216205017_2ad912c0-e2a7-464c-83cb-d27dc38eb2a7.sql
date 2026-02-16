
-- Storage bucket for scheduled content images
INSERT INTO storage.buckets (id, name, public) VALUES ('scheduled-content', 'scheduled-content', true);

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read scheduled content" ON storage.objects FOR SELECT USING (bucket_id = 'scheduled-content');

-- Allow authenticated users to upload
CREATE POLICY "Auth users upload scheduled content" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scheduled-content' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their uploads
CREATE POLICY "Auth users delete scheduled content" ON storage.objects FOR DELETE USING (bucket_id = 'scheduled-content' AND auth.uid() IS NOT NULL);

-- Table for scheduled content slots
CREATE TABLE public.scheduled_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL, -- e.g. "06:00"
  images_count INTEGER NOT NULL DEFAULT 1,
  image_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, generated, scheduled, published, failed
  generated_content JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_date, slot_time)
);

ALTER TABLE public.scheduled_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own slots" ON public.scheduled_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own slots" ON public.scheduled_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own slots" ON public.scheduled_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own slots" ON public.scheduled_slots FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_scheduled_slots_updated_at
BEFORE UPDATE ON public.scheduled_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
