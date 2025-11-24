-- Add unprocessed column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS unprocessed integer NOT NULL DEFAULT 0;