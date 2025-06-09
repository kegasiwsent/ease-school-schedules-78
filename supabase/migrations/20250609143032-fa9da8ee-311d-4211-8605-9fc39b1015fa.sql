
-- Create teachers table to store teacher information
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subjects TEXT[] NOT NULL,
  contact_info TEXT,
  period_limit INTEGER DEFAULT 35,
  is_class_teacher BOOLEAN DEFAULT false,
  class_teacher_of TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create timetable_history table to store generated timetables
CREATE TABLE public.timetable_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  timetable_data JSONB NOT NULL,
  teacher_schedules JSONB NOT NULL,
  class_configs JSONB NOT NULL,
  teachers_data JSONB NOT NULL,
  days TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_teachers_created_at ON public.teachers(created_at DESC);
CREATE INDEX idx_timetable_history_created_at ON public.timetable_history(created_at DESC);

-- Enable Row Level Security (since we don't have auth yet, we'll make tables public for now)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_history ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (you can restrict these later with authentication)
CREATE POLICY "Allow all operations on teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on timetable_history" ON public.timetable_history FOR ALL USING (true) WITH CHECK (true);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for teachers
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
