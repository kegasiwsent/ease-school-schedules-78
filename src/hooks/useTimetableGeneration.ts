
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

      // Track teacher period counts
      const teacherPeriodCounts: { [teacherId: string]: number } = {};

      // Initialize timetables
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        state.timetables[className] = {};
        allDays.forEach(day => {
          const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
          state.timetables[className][day] = Array(periodsForDay).fill(null);
        });
      });

      // Initialize teacher schedules and period counts
      teachers.forEach(teacher => {
        state.teacherSchedules[teacher.id] = {};
        teacherPeriodCounts[teacher.id] = 0;
        allDays.forEach(day => {
          const maxPeriodsForDay = day === 'Saturday' 
            ? Math.max(...classConfigs.filter(c => c.includeSaturday).map(c => c.saturdayPeriods))
            : Math.max(...classConfigs.map(c => c.weekdayPeriods));
          state.teacherSchedules[teacher.id][day] = Array(maxPeriodsForDay || (day === 'Saturday' ? 4 : 7)).fill(null);
        });
      });

      // STEP 1: Assign class teachers to first periods with core subjects
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        
        // Find the class teacher for this specific class
        const classTeacher = teachers.find(teacher => 
          teacher.isClassTeacher && teacher.classTeacherOf === className
        );
        
        if (classTeacher) {
          console.log(`🎯 Processing class teacher ${classTeacher.name} for ${className}`);
          
          // Find core subjects that this class teacher can teach for this class
          const teachableCoreSubjects = config.subjectAssignments.filter(
            assignment => assignment.teacherId === classTeacher.id && 
                         coreSubjects.includes(assignment.subject)
          );
          
          // If no core subjects, fall back to any subject they can teach
          const fallbackSubjects = config.subjectAssignments.filter(
            assignment => assignment.teacherId === classTeacher.id
          );
          
          const subjectsToUse = teachableCoreSubjects.length > 0 ? teachableCoreSubjects : fallbackSubjects;
          
          if (subjectsToUse.length > 0) {
            const workingDays = config.includeSaturday ? allDays : days;
            
            console.log(`📚 Available core subjects for ${classTeacher.name}:`, 
              subjectsToUse.map(s => s.subject));
            
            // Assign first period on ALL working days with core subjects
            workingDays.forEach((day, dayIndex) => {
              const periodIndex = 0; // First period
              
              // Check if teacher has reached period limit
              if (teacherPeriodCounts[classTeacher.id] >= (classTeacher.periodLimit || 35)) {
                console.log(`⚠️ Class teacher ${classTeacher.name} has reached period limit`);
                return;
              }
              
              // Rotate through available core subjects for variety
              const subjectAssignment = subjectsToUse[dayIndex % subjectsToUse.length];
              
              // Assign the class teacher to first period
              if (state.timetables[className][day][periodIndex] === null) {
                updateScheduleState(
                  state, 
                  className, 
                  day, 
                  periodIndex, 
                  subjectAssignment.subject, 
                  classTeacher.id, 
                  classTeacher.name
                );
                
                // Increment teacher's period count
                teacherPeriodCounts[classTeacher.id]++;
                
                console.log(`✅ Class teacher ${classTeacher.name} assigned 1st period on ${day} for ${className} (${subjectAssignment.subject}) - Total periods: ${teacherPeriodCounts[classTeacher.id]}`);
              }
            });
          } else {
            console.log(`❌ Class teacher ${classTeacher.name} has no teachable subjects for ${className}`);
          }
        } else {
          console.log(`⚠️ No class teacher found for ${className}`);
        }
      });

      // STEP 2: Fill remaining periods with proper distribution
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

        // Distribute subjects evenly across days
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
            
            // Check if teacher has reached period limit
            if (teacherPeriodCounts[teacher.id] >= (teacher.periodLimit || 35)) {
              console.log(`⚠️ Teacher ${teacher.name} has reached period limit (${teacherPeriodCounts[teacher.id]}/${teacher.periodLimit || 35})`);
              
              // Find alternative teacher for this subject
              const alternativeTeacher = teachers.find(t => 
                t.id !== teacher.id && 
                t.subjects.includes(assignment.subject) &&
                teacherPeriodCounts[t.id] < (t.periodLimit || 35)
              );
              
              if (alternativeTeacher) {
                console.log(`🔄 Assigning ${assignment.subject} to alternative teacher: ${alternativeTeacher.name}`);
                
                const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
                
                // Skip first period (reserved for class teacher) and try other periods
                for (let period = 1; period < periodsForDay && periodsAssigned < remainingPeriods; period++) {
                  if (canPlacePeriod(state, className, day, period, assignment.subject, alternativeTeacher.id, teachers)) {
                    updateScheduleState(state, className, day, period, assignment.subject, alternativeTeacher.id, alternativeTeacher.name);
                    teacherPeriodCounts[alternativeTeacher.id]++;
                    periodsAssigned++;
                    break;
                  }
                }
              }
              return;
            }
            
            const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
            
            // Skip first period (reserved for class teacher) and try other periods
            for (let period = 1; period < periodsForDay && periodsAssigned < remainingPeriods; period++) {
              if (canPlacePeriod(state, className, day, period, assignment.subject, teacher.id, teachers)) {
                updateScheduleState(state, className, day, period, assignment.subject, teacher.id, teacher.name);
                teacherPeriodCounts[teacher.id]++;
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
              
              // Check if teacher has reached period limit
              if (teacherPeriodCounts[teacher.id] >= (teacher.periodLimit || 35)) {
                // Find alternative teacher
                const alternativeTeacher = teachers.find(t => 
                  t.id !== teacher.id && 
                  t.subjects.includes(assignment.subject) &&
                  teacherPeriodCounts[t.id] < (t.periodLimit || 35)
                );
                
                if (alternativeTeacher) {
                  const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
                  
                  for (let period = 1; period < periodsForDay && periodsAssigned < remainingPeriods; period++) {
                    if (canPlacePeriod(state, className, day, period, assignment.subject, alternativeTeacher.id, teachers)) {
                      updateScheduleState(state, className, day, period, assignment.subject, alternativeTeacher.id, alternativeTeacher.name);
                      teacherPeriodCounts[alternativeTeacher.id]++;
                      periodsAssigned++;
                      break;
                    }
                  }
                }
                return;
              }
              
              const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
              
              for (let period = 1; period < periodsForDay && periodsAssigned < remainingPeriods; period++) {
                if (canPlacePeriod(state, className, day, period, assignment.subject, teacher.id, teachers)) {
                  updateScheduleState(state, className, day, period, assignment.subject, teacher.id, teacher.name);
                  teacherPeriodCounts[teacher.id]++;
                  periodsAssigned++;
                  break;
                }
              }
            });
          }

          console.log(`${className} - ${assignment.subject}: Assigned ${periodsAssigned}/${remainingPeriods} additional periods (Teacher: ${teacher.name})`);
        });

        // Fill remaining slots with free periods (avoiding back-to-back)
        workingDays.forEach(day => {
          const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
          
          for (let period = 0; period < periodsForDay; period++) {
            if (state.timetables[className][day][period] === null) {
              // Check if we can place a free period here (no back-to-back free periods)
              if (canPlaceFreePeriod(state, className, day, period)) {
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

      // Final validation and summary
      console.log('\n📊 TEACHER PERIOD SUMMARY:');
      teachers.forEach(teacher => {
        const totalPeriods = teacherPeriodCounts[teacher.id] || 0;
        const limit = teacher.periodLimit || 35;
        const status = totalPeriods <= limit ? '✅' : '⚠️';
        console.log(`${status} ${teacher.name}: ${totalPeriods}/${limit} periods (Class Teacher: ${teacher.isClassTeacher ? teacher.classTeacherOf || 'Yes' : 'No'})`);
      });

      console.log('\n🎯 Enhanced timetable generated with structured class teacher assignment!');

      resolve({ 
        timetables: state.timetables, 
        teacherSchedules: teacherTimetables,
        days: allDays 
      });
    });
  }, []);

  return { generateTimetables };
};
