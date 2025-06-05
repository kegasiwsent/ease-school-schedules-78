
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

      // Step 1: Assign class teachers to first periods on ALL working days for their assigned class ONLY
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
              
              // Assign first period on ALL working days for class teacher in their assigned class only
              workingDays.forEach(day => {
                const periodIndex = 0;
                
                // Check if teacher is already assigned to another class at this time
                if (state.teacherSchedules[teacher.id][day][periodIndex] === null &&
                    state.timetables[className][day][periodIndex] === null) {
                  
                  // Direct assignment for class teacher in their assigned class
                  state.timetables[className][day][periodIndex] = {
                    subject: teachableSubject.subject,
                    teacher: teacher.name,
                    teacherId: teacher.id
                  };
                  state.teacherSchedules[teacher.id][day][periodIndex] = className;
                  
                  // Update tracking for class teacher assignments
                  if (!state.subjectLastPlaced[className]) state.subjectLastPlaced[className] = {};
                  if (!state.subjectLastPlaced[className][teachableSubject.subject]) state.subjectLastPlaced[className][teachableSubject.subject] = {};
                  state.subjectLastPlaced[className][teachableSubject.subject][day] = periodIndex;

                  if (!state.subjectDayCount[className]) state.subjectDayCount[className] = {};
                  if (!state.subjectDayCount[className][teachableSubject.subject]) state.subjectDayCount[className][teachableSubject.subject] = {};
                  state.subjectDayCount[className][teachableSubject.subject][day] = (state.subjectDayCount[className][teachableSubject.subject][day] || 0) + 1;

                  if (!state.teacherConsecutive[teacher.id]) state.teacherConsecutive[teacher.id] = {};
                  state.teacherConsecutive[teacher.id][day] = 1;
                  
                  console.log(`✅ Class teacher ${teacher.name} assigned first period on ${day} for ${className} (${teachableSubject.subject})`);
                } else {
                  console.log(`❌ Failed to assign class teacher ${teacher.name} on ${day} for ${className} - conflict detected`);
                }
              });
            } else {
              console.log(`❌ Class teacher ${teacher.name} has no teachable subjects for ${className}`);
            }
          }
        }
      });

      // Step 2: Generate timetables with enhanced logic for remaining periods
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

          // Count already assigned periods for this subject (including class teacher periods)
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

          // Strategy 2: Fill remaining periods with improved distribution and strict conflict checking
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

          // Place remaining periods with strict conflict checking
          for (const attempt of attempts) {
            if (assignedPeriods >= maxPeriods) break;
            
            // Enhanced conflict checking - ensure teacher is not assigned to any other class at this time
            const isTeacherFree = state.teacherSchedules[teacher.id][attempt.day][attempt.period] === null;
            
            if (isTeacherFree && canPlacePeriod(state, className, attempt.day, attempt.period, assignment.subject, teacher.id, teachers)) {
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

      // Final validation - check for conflicts
      let hasConflicts = false;
      teachers.forEach(teacher => {
        allDays.forEach(day => {
          const schedule = teacherTimetables[teacher.id][day];
          schedule.forEach((period, periodIndex) => {
            if (period) {
              // Count how many times this teacher appears at this time slot
              let conflicts = 0;
              Object.entries(state.timetables).forEach(([className, classTimetable]) => {
                const slot = classTimetable[day]?.[periodIndex];
                if (slot && slot.teacherId === teacher.id) {
                  conflicts++;
                }
              });
              
              if (conflicts > 1) {
                console.error(`❌ CONFLICT: Teacher ${teacher.name} assigned to multiple classes at ${day} period ${periodIndex + 1}`);
                hasConflicts = true;
              }
            }
          });
        });
      });

      if (!hasConflicts) {
        console.log('✅ No teacher conflicts detected across all classes and periods');
      }

      resolve({ 
        timetables: state.timetables, 
        teacherSchedules: teacherTimetables,
        days: allDays 
      });
    });
  }, []);

  return { generateTimetables };
};
