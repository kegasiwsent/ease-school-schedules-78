
import { useCallback } from 'react';
import type { Teacher, ClassConfig, ScheduleState, GeneratedTimetables } from '@/types/timetable';
import { canPlacePeriod, updateScheduleState, activitySubjects } from '@/utils/timetableUtils';

export const useTimetableGeneration = () => {
  const generateTimetables = useCallback((
    teachers: Teacher[],
    classConfigs: ClassConfig[]
  ): Promise<GeneratedTimetables> => {
    return new Promise((resolve) => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const allDays = [...days];
      
      // Add Saturday if any class includes it
      const hasSaturday = classConfigs.some(config => config.includeSaturday);
      if (hasSaturday) {
        allDays.push('Saturday');
      }

      // Initialize schedule state
      const state: ScheduleState = {
        timetables: {},
        teacherSchedules: {},
        subjectLastPlaced: {},
        teacherConsecutive: {},
        subjectDayCount: {}
      };

      // Initialize timetables
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        state.timetables[className] = {};
        allDays.forEach(day => {
          const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
          state.timetables[className][day] = Array(periodsForDay).fill(null);
        });
      });

      // Initialize teacher schedules
      teachers.forEach(teacher => {
        state.teacherSchedules[teacher.id] = {};
        allDays.forEach(day => {
          const maxPeriodsForDay = day === 'Saturday' 
            ? Math.max(...classConfigs.filter(c => c.includeSaturday).map(c => c.saturdayPeriods))
            : Math.max(...classConfigs.map(c => c.weekdayPeriods));
          state.teacherSchedules[teacher.id][day] = Array(maxPeriodsForDay || (day === 'Saturday' ? 4 : 7)).fill(null);
        });
      });

      // Step 1: Assign class teachers to first periods
      teachers.forEach(teacher => {
        if (teacher.isClassTeacher && teacher.classTeacherOf) {
          const className = teacher.classTeacherOf;
          const config = classConfigs.find(c => `${c.class}${c.division}` === className);
          
          if (config) {
            // Find a subject this teacher can teach for this class
            const teachableSubject = config.subjectAssignments.find(
              assignment => assignment.teacherId === teacher.id
            );
            
            if (teachableSubject) {
              const workingDays = config.includeSaturday ? allDays : days;
              
              // Try to place on Monday first, then other days
              for (const day of workingDays) {
                if (canPlacePeriod(state, className, day, 0, teachableSubject.subject, teacher.id, teachers)) {
                  updateScheduleState(state, className, day, 0, teachableSubject.subject, teacher.id, teacher.name);
                  console.log(`Class teacher ${teacher.name} assigned first period on ${day} for ${className}`);
                  break;
                }
              }
            }
          }
        }
      });

      // Step 2: Generate timetables with enhanced logic
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        const workingDays = config.includeSaturday ? allDays : days;
        
        // Sort assignments by priority (activity subjects first for better distribution)
        const sortedAssignments = [...config.subjectAssignments].sort((a, b) => {
          const aIsActivity = activitySubjects.includes(a.subject);
          const bIsActivity = activitySubjects.includes(b.subject);
          if (aIsActivity && !bIsActivity) return -1;
          if (!aIsActivity && bIsActivity) return 1;
          return 0;
        });

        sortedAssignments.forEach(assignment => {
          const teacher = teachers.find(t => t.id === assignment.teacherId);
          if (!teacher) return;

          // Count already assigned periods for this subject (including class teacher period)
          let assignedPeriods = 0;
          workingDays.forEach(day => {
            const daySchedule = state.timetables[className][day];
            daySchedule.forEach(period => {
              if (period && period.subject === assignment.subject && period.teacherId === teacher.id) {
                assignedPeriods++;
              }
            });
          });

          const maxPeriods = assignment.periodsPerWeek;
          const isActivitySubject = activitySubjects.includes(assignment.subject);

          // Strategy 1: Distribute activity subjects across different days first
          if (isActivitySubject) {
            for (let dayIndex = 0; dayIndex < workingDays.length && assignedPeriods < maxPeriods; dayIndex++) {
              const day = workingDays[dayIndex];
              const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
              
              // Try to place one period per day for activity subjects
              const currentDayCount = state.subjectDayCount[className]?.[assignment.subject]?.[day] || 0;
              if (currentDayCount === 0) {
                
                // Find suitable slots (prefer middle periods for activity subjects)
                const preferredSlots = [];
                const middleStart = Math.floor(periodsForDay / 3);
                const middleEnd = Math.floor((2 * periodsForDay) / 3);
                
                for (let period = middleStart; period < middleEnd; period++) {
                  preferredSlots.push(period);
                }
                
                // Add remaining slots
                for (let period = 0; period < periodsForDay; period++) {
                  if (!preferredSlots.includes(period)) {
                    preferredSlots.push(period);
                  }
                }

                for (const period of preferredSlots) {
                  if (canPlacePeriod(state, className, day, period, assignment.subject, teacher.id, teachers)) {
                    updateScheduleState(state, className, day, period, assignment.subject, teacher.id, teacher.name);
                    assignedPeriods++;
                    break;
                  }
                }
              }
            }
          }

          // Strategy 2: Fill remaining periods with improved distribution
          const attempts = [];
          
          // Create all possible placements
          for (let dayIndex = 0; dayIndex < workingDays.length; dayIndex++) {
            const day = workingDays[dayIndex];
            const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
            
            for (let period = 0; period < periodsForDay; period++) {
              attempts.push({ day, period, dayIndex });
            }
          }

          // Shuffle attempts for better distribution
          for (let i = attempts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [attempts[i], attempts[j]] = [attempts[j], attempts[i]];
          }

          // Place remaining periods
          for (const attempt of attempts) {
            if (assignedPeriods >= maxPeriods) break;
            
            if (canPlacePeriod(state, className, attempt.day, attempt.period, assignment.subject, teacher.id, teachers)) {
              updateScheduleState(state, className, attempt.day, attempt.period, assignment.subject, teacher.id, teacher.name);
              assignedPeriods++;
            }
          }

          console.log(`${className} - ${assignment.subject}: Assigned ${assignedPeriods}/${maxPeriods} periods (Teacher: ${teacher.name}, Limit: ${teacher.periodLimit || 'No limit'})`);
        });
      });

      // Generate teacher-specific timetables from the class timetables
      const teacherTimetables: { [teacherId: string]: { [day: string]: ({ class: string; subject: string } | null)[] } } = {};
      
      teachers.forEach(teacher => {
        teacherTimetables[teacher.id] = {};
        allDays.forEach(day => {
          const maxPeriodsForDay = day === 'Saturday' 
            ? Math.max(...classConfigs.filter(c => c.includeSaturday).map(c => c.saturdayPeriods))
            : Math.max(...classConfigs.map(c => c.weekdayPeriods));
          teacherTimetables[teacher.id][day] = Array(maxPeriodsForDay || (day === 'Saturday' ? 4 : 7)).fill(null);
        });
      });

      // Populate teacher timetables from class schedules
      Object.entries(state.timetables).forEach(([className, classTimetable]) => {
        Object.entries(classTimetable).forEach(([day, daySchedule]) => {
          daySchedule.forEach((period, periodIndex) => {
            if (period) {
              const teacherId = period.teacherId;
              if (teacherTimetables[teacherId] && teacherTimetables[teacherId][day]) {
                teacherTimetables[teacherId][day][periodIndex] = {
                  class: className,
                  subject: period.subject
                };
              }
            }
          });
        });
      });

      resolve({ 
        timetables: state.timetables, 
        teacherSchedules: teacherTimetables,
        days: allDays 
      });
    });
  }, []);

  return { generateTimetables };
};
