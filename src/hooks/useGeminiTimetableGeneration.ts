
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Teacher, ClassConfig, GeneratedTimetables } from '@/types/timetable';

export const useGeminiTimetableGeneration = () => {
  const generateTimetables = useCallback(async (
    teachers: Teacher[],
    classConfigs: ClassConfig[]
  ): Promise<GeneratedTimetables> => {
    console.log('🤖 Starting AI-Powered Timetable Generation with Gemini');
    console.log('📊 Classes:', classConfigs.map(c => `${c.class}${c.division}`));
    console.log('👨‍🏫 Teachers:', teachers.map(t => t.name));

    try {
      const { data, error } = await supabase.functions.invoke('generate-timetable-ai', {
        body: {
          teachers,
          classConfigs
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Failed to generate timetable: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from AI generation');
      }

      // Validate the response structure
      if (!data.timetables || !data.teacherSchedules) {
        throw new Error('Invalid timetable data structure received from AI');
      }

      // Add days array if not present
      const days = data.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      if (classConfigs.some(config => config.includeSaturday)) {
        if (!days.includes('Saturday')) {
          days.push('Saturday');
        }
      }

      console.log('🎉 AI-Generated Timetable completed successfully!');
      
      return {
        timetables: data.timetables,
        teacherSchedules: data.teacherSchedules,
        days
      };

    } catch (error) {
      console.error('❌ Error in AI timetable generation:', error);
      throw error;
    }
  }, []);

  return { generateTimetables };
};
