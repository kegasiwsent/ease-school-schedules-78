
import type { Teacher } from '@/types/timetable';

export const getAllAvailableSubjects = (teachers: Teacher[]): string[] => {
  const subjectSet = new Set<string>();
  
  teachers.forEach(teacher => {
    teacher.subjects.forEach(subject => {
      subjectSet.add(subject);
    });
  });
  
  return Array.from(subjectSet).sort();
};

export const getDefaultSubjects = (): string[] => {
  return ['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE', 'Science', 'Drawing', 'Sanskrit'];
};
