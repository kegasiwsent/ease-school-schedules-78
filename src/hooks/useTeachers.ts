
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/types/timetable';

export const useTeachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTeachers: Teacher[] = data?.map(teacher => ({
        id: teacher.id,
        name: teacher.name,
        subjects: teacher.subjects || [], // Keep for backward compatibility
        mainSubjects: teacher.main_subjects || [],
        extraSubjects: teacher.extra_subjects || [],
        contactInfo: teacher.contact_info,
        assignedPeriods: {},
        periodLimit: teacher.period_limit,
        isClassTeacher: teacher.is_class_teacher,
        classTeacherOf: teacher.class_teacher_of
      })) || [];

      setTeachers(formattedTeachers);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast({
        title: "Error",
        description: "Failed to load teachers from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTeacher = async (teacher: Teacher) => {
    try {
      console.log('Saving teacher with main/extra subjects:', teacher);
      
      const { error } = await supabase
        .from('teachers')
        .insert({
          name: teacher.name,
          subjects: [...(teacher.mainSubjects || []), ...(teacher.extraSubjects || [])], // Combined for backward compatibility
          main_subjects: teacher.mainSubjects || [],
          extra_subjects: teacher.extraSubjects || [],
          contact_info: teacher.contactInfo || null,
          period_limit: teacher.periodLimit || 35,
          is_class_teacher: teacher.isClassTeacher || false,
          class_teacher_of: teacher.classTeacherOf || null
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Add to local state
      await loadTeachers();

      toast({
        title: "Teacher Saved",
        description: `${teacher.name} has been saved to the database`,
      });
    } catch (error) {
      console.error('Error saving teacher:', error);
      toast({
        title: "Error",
        description: `Failed to save teacher to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          name: updates.name,
          subjects: updates.subjects,
          main_subjects: updates.mainSubjects,
          extra_subjects: updates.extraSubjects,
          contact_info: updates.contactInfo,
          period_limit: updates.periodLimit,
          is_class_teacher: updates.isClassTeacher,
          class_teacher_of: updates.classTeacherOf
        })
        .eq('id', id);

      if (error) throw error;

      setTeachers(prev => prev.map(teacher => 
        teacher.id === id ? { ...teacher, ...updates } : teacher
      ));

      toast({
        title: "Teacher Updated",
        description: "Teacher information has been updated",
      });
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast({
        title: "Error",
        description: "Failed to update teacher",
        variant: "destructive"
      });
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTeachers(prev => prev.filter(teacher => teacher.id !== id));

      toast({
        title: "Teacher Deleted",
        description: "Teacher has been removed from the database",
      });
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  return {
    teachers,
    setTeachers,
    loading,
    saveTeacher,
    updateTeacher,
    deleteTeacher,
    loadTeachers
  };
};
