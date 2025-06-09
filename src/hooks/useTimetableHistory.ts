
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Teacher, ClassConfig, GeneratedTimetables } from '@/types/timetable';

export interface TimetableHistoryItem {
  id: string;
  name: string;
  timetable_data: any;
  teacher_schedules: any;
  class_configs: ClassConfig[];
  teachers_data: Teacher[];
  days: string[];
  created_at: string;
}

export const useTimetableHistory = () => {
  const [history, setHistory] = useState<TimetableHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('timetable_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert the JSON data to proper TypeScript types
      const typedHistory: TimetableHistoryItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        timetable_data: item.timetable_data,
        teacher_schedules: item.teacher_schedules,
        class_configs: item.class_configs as unknown as ClassConfig[],
        teachers_data: item.teachers_data as unknown as Teacher[],
        days: item.days,
        created_at: item.created_at
      }));
      
      setHistory(typedHistory);
    } catch (error) {
      console.error('Error loading timetable history:', error);
      toast({
        title: "Error",
        description: "Failed to load timetable history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTimetable = async (
    name: string,
    timetables: GeneratedTimetables,
    classConfigs: ClassConfig[],
    teachers: Teacher[]
  ) => {
    try {
      const { error } = await supabase
        .from('timetable_history')
        .insert({
          name,
          timetable_data: timetables.timetables,
          teacher_schedules: timetables.teacherSchedules,
          class_configs: classConfigs,
          teachers_data: teachers,
          days: timetables.days
        });

      if (error) throw error;

      toast({
        title: "Timetable Saved",
        description: `${name} has been saved to history`,
      });

      loadHistory(); // Reload to show the new entry
    } catch (error) {
      console.error('Error saving timetable:', error);
      toast({
        title: "Error",
        description: "Failed to save timetable to history",
        variant: "destructive"
      });
    }
  };

  const deleteTimetable = async (id: string) => {
    try {
      const { error } = await supabase
        .from('timetable_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.filter(item => item.id !== id));

      toast({
        title: "Timetable Deleted",
        description: "Timetable has been removed from history",
      });
    } catch (error) {
      console.error('Error deleting timetable:', error);
      toast({
        title: "Error",
        description: "Failed to delete timetable",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return {
    history,
    loading,
    saveTimetable,
    deleteTimetable,
    loadHistory
  };
};
