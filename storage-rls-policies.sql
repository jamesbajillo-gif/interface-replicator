-- =====================================================
-- Storage RLS Policies for lead-files bucket
-- =====================================================
-- This configures Row Level Security policies for the
-- lead-files storage bucket to allow authenticated users
-- to upload, view, update, and delete files.
-- Path structure: lead{affiliate_id}/{filename}
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view lead files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload lead files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update lead files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete lead files" ON storage.objects;

-- Policy 1: Allow authenticated users to view files in lead-files bucket
CREATE POLICY "Authenticated users can view lead files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'lead-files' AND
    auth.role() = 'authenticated'
  );

-- Policy 2: Allow authenticated users to upload files to lead-files bucket
-- Validates that paths start with 'lead' prefix (e.g., lead16/filename.csv)
CREATE POLICY "Authenticated users can upload lead files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-files' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] LIKE 'lead%'
  );

-- Policy 3: Allow authenticated users to update files in lead-files bucket
CREATE POLICY "Authenticated users can update lead files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'lead-files' AND
    auth.role() = 'authenticated'
  );

-- Policy 4: Allow authenticated users to delete files in lead-files bucket
CREATE POLICY "Authenticated users can delete lead files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'lead-files' AND
    auth.role() = 'authenticated'
  );

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the policies were created:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage';
