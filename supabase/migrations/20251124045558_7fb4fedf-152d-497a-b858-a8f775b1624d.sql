-- Add unprocessed_file_path column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS unprocessed_file_path text;

-- Update unprocessed column to integer if it's not already (for storing count)
-- First check if we need to update the column type
DO $$ 
BEGIN
  -- If unprocessed column exists and is not integer, alter it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'leads' 
    AND column_name = 'unprocessed' 
    AND data_type != 'integer'
  ) THEN
    ALTER TABLE public.leads ALTER COLUMN unprocessed TYPE integer USING unprocessed::integer;
    ALTER TABLE public.leads ALTER COLUMN unprocessed SET DEFAULT 0;
  END IF;
END $$;