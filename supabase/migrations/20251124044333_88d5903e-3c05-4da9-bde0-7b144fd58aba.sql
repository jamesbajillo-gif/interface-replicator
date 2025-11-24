-- Add phone column tracking to leads table
ALTER TABLE public.leads 
ADD COLUMN main_phone_column text,
ADD COLUMN dialables_phone_column text DEFAULT 'phone_numbers';