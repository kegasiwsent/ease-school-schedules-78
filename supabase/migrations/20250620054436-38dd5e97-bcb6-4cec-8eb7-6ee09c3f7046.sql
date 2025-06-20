
-- Add main_subjects and extra_subjects columns to teachers table
ALTER TABLE public.teachers 
ADD COLUMN main_subjects text[] DEFAULT '{}',
ADD COLUMN extra_subjects text[] DEFAULT '{}';
