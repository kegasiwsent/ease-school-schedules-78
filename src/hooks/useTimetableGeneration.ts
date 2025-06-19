
import { useCallback } from 'react';
import type { Teacher, ClassConfig, ScheduleState, GeneratedTimetables } from '@/types/timetable';
import { 
  canPlacePeriod, 
  updateScheduleState, 
  activitySubjects, 
  coreSubjects,
  getOptimalDayForSubject,
  canPlaceFreePeriod
} from '@/utils/timetableUtils';

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

      // ENHANCED Step 1: Assign class teachers to first periods with core subjects priority
      teachers.forEach(teacher => {
        if (teacher.isClassTeacher && teacher.classTeacherOf) {
          const className = teacher.classTeacherOf;
          const config = classConfigs.find(c => `${c.class}${c.division}` === className);
          
          if (config) {
            // Find core subjects that this teacher can teach for this class
            const teachableCoreSubjects = config.subjectAssignments.filter(
              assignment => assignment.teacherId === teacher.id && 
                           coreSubjects.includes(assignment.subject)
            );
            
            // If no core subjects, fall back to any subject this teacher can teach
            const teachableSubjects = teachableCoreSubjects.length > 0 
              ? teachableCoreSubjects 
              : config.subjectAssignments.filter(assignment => assignment.teacherId === teacher.id);
            
            if (teachableSubjects.length > 0) {
              const workingDays = config.includeSaturday ? allDays : days;
              
              // Assign first period on ALL working days with variety in core subjects
              workingDays.forEach((day, index) => {
                const periodIndex = 0;
                
                // Rotate through available core subjects for variety
                const subjectToAssign = teachableSubjects[index % teachableSubjects.length];
                
                // Check if teacher is available and slot is free
                if (state.teacherSchedules[teacher.id][day][periodIndex] === null &&
                    state.timetables[className][day][periodIndex] === null) {
                  
                  updateScheduleState(state, className, day, periodIndex, subjectToAssign.subject, teacher.id, teacher.name);
                  
                  console.log(`✅ Class teacher ${teacher.name} assigned 1st period on ${day} for ${className} (${subjectToAssign.subject})`);
                } else {
                  console.log(`❌ Failed to assign class teacher ${teacher.name} on ${day} for ${className} - conflict detected`);
                }
              });
            }
          }
        }
      });

      // ENHANCED Step 2: Generate remaining timetables with improved distribution
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        const workingDays = config.includeSaturday ? allDays : days;
        
        // Calculate remaining periods needed for each subject
        const subjectPeriodTracker: { [subject: string]: number } = {};
        
        config.subjectAssignments.forEach(assignment => {
          // Count already assigned periods for this subject
          let assignedPeriods = 0;
          workingDays.forEach(day => {
            const daySchedule = state.timetables[className][day];
            daySchedule.forEach(period => {
              if (period && period.subject === assignment.subject && period.teacherId === assignment.teacherId) {
                assignedPeriods++;
              }
            });
          });
          
          subjectPeriodTracker[assignment.subject] = assignment.periodsPerWeek - assignedPeriods;
        });

        // Process subjects in order: activities first for better spread, then others
        const sortedAssignments = [...config.subjectAssignments].sort((a, b) => {
          const aIsActivity = activitySubjects.includes(a.subject);
          const bIsActivity = activitySubjects.includes(b.subject);
          if (aIsActivity && !bIsActivity) return -1;
          if (!aIsActivity && bIsActivity) return 1;
          return 0;
        });

        // ENHANCED: Distribute subjects evenly across days
        sortedAssignments.forEach(assignment => {
          const teacher = teachers.find(t => t.id === assignment.teacherId);
          if (!teacher) return;

          const remainingPeriods = subjectPeriodTracker[assignment.subject] || 0;
          if (remainingPeriods <= 0) return;

          // Get optimal days for this subject to ensure even distribution
          const optimalDays = getOptimalDayForSubject(state, className, assignment.subject, workingDays, remainingPeriods);
          
          let periodsAssigned = 0;

          // Try to place one period per optimal day
          optimalDays.forEach(day => {
            if (periodsAssigned >= remainingPeriods) return;
            
            const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
            
            // Skip first period (reserved for class teacher) and try other periods
            for (let period = 1; period < periodsForDay && periodsAssigned < remainingPeriods; period++) {
              if (canPlacePeriod(state, className, day, period, assignment.subject, teacher.id, teachers)) {
                updateScheduleState(state, className, day, period, assignment.subject, teacher.id, teacher.name);
                periodsAssigned++;
                break; // Only one period per day per subject
              }
            }
          });

          // If still need more periods, try remaining days
          if (periodsAssigned < remainingPeriods) {
            const remainingDays = workingDays.filter(day => !optimalDays.includes(day));
            
            remainingDays.forEach(day => {
              if (periodsAssigned >= remainingPeriods) return;
              
              const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
              
              for (let period = 1; period < periodsForDay && periodsAssigned < remainingPeriods; period++) {
                if (canPlacePeriod(state, className, day, period, assignment.subject, teacher.id, teachers)) {
                  updateScheduleState(state, className, day, period, assignment.subject, teacher.id, teacher.name);
                  periodsAssigned++;
                  break;
                }
              }
            });
          }

          console.log(`${className} - ${assignment.subject}: Assigned ${periodsAssigned}/${remainingPeriods} additional periods (Teacher: ${teacher.name})`);
        });

        // ENHANCED: Fill remaining slots with free periods (avoiding back-to-back)
        workingDays.forEach(day => {
          const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
          
          for (let period = 0; period < periodsForDay; period++) {
            if (state.timetables[className][day][period] === null) {
              // Check if we can place a free period here (no back-to-back free periods)
              if (canPlaceFreePeriod(state, className, day, period)) {
                // Leave as free period (null)
                console.log(`${className} - Free period placed at ${day} period ${period + 1}`);
              }
            }
          }
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

      // Final validation - check for conflicts and subject distribution
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

      // Validate subject distribution (max one per day)
      Object.entries(state.timetables).forEach(([className, classTimetable]) => {
        Object.entries(classTimetable).forEach(([day, daySchedule]) => {
          const subjectCount: { [subject: string]: number } = {};
          daySchedule.forEach(period => {
            if (period) {
              subjectCount[period.subject] = (subjectCount[period.subject] || 0) + 1;
              if (subjectCount[period.subject] > 1) {
                console.warn(`⚠️ WARNING: ${className} has multiple ${period.subject} periods on ${day}`);
              }
            }
          });
        });
      });

      if (!hasConflicts) {
        console.log('✅ No teacher conflicts detected - Enhanced timetable with even subject distribution generated');
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
