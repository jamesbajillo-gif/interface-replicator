-- Create storage bucket for lead files
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-files', 'lead-files', true);

-- RLS policies for lead-files bucket
CREATE POLICY "Users can view their own lead files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'lead-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own lead files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own lead files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'lead-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add file paths columns to leads table
ALTER TABLE public.leads
ADD COLUMN main_file_path TEXT,
ADD COLUMN dialables_file_path TEXT;