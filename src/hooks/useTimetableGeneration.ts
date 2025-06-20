
import { useCallback } from 'react';
import type { Teacher, ClassConfig, ScheduleState, GeneratedTimetables } from '@/types/timetable';
import { 
  canPlacePeriod, 
  updateScheduleState, 
  activitySubjects, 
  coreSubjects,
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

      // Track teacher availability and period counts
      const teacherAvailability: { [teacherId: string]: { [day: string]: { [period: number]: boolean } } } = {};
      const teacherPeriodCounts: { [teacherId: string]: number } = {};

      // Initialize data structures
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        state.timetables[className] = {};
        state.subjectLastPlaced[className] = {};
        state.subjectDayCount[className] = {};
        
        allDays.forEach(day => {
          const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
          state.timetables[className][day] = Array(periodsForDay).fill(null);
        });
      });

      // Initialize teacher schedules and availability
      teachers.forEach(teacher => {
        state.teacherSchedules[teacher.id] = {};
        teacherAvailability[teacher.id] = {};
        teacherPeriodCounts[teacher.id] = 0;
        state.teacherConsecutive[teacher.id] = {};
        
        allDays.forEach(day => {
          const maxPeriodsForDay = day === 'Saturday' 
            ? Math.max(...classConfigs.filter(c => c.includeSaturday).map(c => c.saturdayPeriods))
            : Math.max(...classConfigs.map(c => c.weekdayPeriods));
          
          const periods = maxPeriodsForDay || (day === 'Saturday' ? 4 : 7);
          state.teacherSchedules[teacher.id][day] = Array(periods).fill(null);
          teacherAvailability[teacher.id][day] = {};
          state.teacherConsecutive[teacher.id][day] = 0;
          
          // Initialize all periods as free
          for (let period = 0; period < periods; period++) {
            teacherAvailability[teacher.id][day][period] = true; // true = free, false = occupied
          }
        });
      });

      // Helper functions
      const getTeacherForClass = (className: string): Teacher | null => {
        const config = classConfigs.find(c => `${c.class}${c.division}` === className);
        if (!config || !config.classTeacherId) return null;
        return teachers.find(teacher => teacher.id === config.classTeacherId) || null;
      };

      const markTeacherOccupied = (teacherId: string, day: string, period: number) => {
        if (teacherAvailability[teacherId] && teacherAvailability[teacherId][day]) {
          teacherAvailability[teacherId][teacherId][day][period] = false;
        }
      };

      const getTeacherPrimarySubject = (teacher: Teacher, classAssignments: any[]): string | null => {
        // Find the first core subject the teacher can teach for this class
        const availableCoreSubjects = coreSubjects.filter(subject => 
          teacher.subjects.includes(subject) &&
          classAssignments.some(assignment => assignment.subject === subject)
        );
        
        if (availableCoreSubjects.length > 0) {
          return availableCoreSubjects[0];
        }
        
        // If no core subjects, return first available subject
        const availableSubjects = teacher.subjects.filter(subject =>
          classAssignments.some(assignment => assignment.subject === subject)
        );
        
        return availableSubjects.length > 0 ? availableSubjects[0] : null;
      };

      console.log('🎯 Starting Enhanced Timetable Generation Algorithm with Class Teacher Priority');
      
      // === PHASE 1: ASSIGN FIRST PERIODS TO CLASS TEACHERS ===
      console.log('📋 Phase 1: Assigning Class Teachers to First Period');
      
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        const classTeacher = getTeacherForClass(className);
        
        if (classTeacher) {
          const classTeacherPrimarySubject = getTeacherPrimarySubject(classTeacher, config.subjectAssignments);
          
          if (classTeacherPrimarySubject) {
            const workingDays = config.includeSaturday ? allDays : days;
            
            workingDays.forEach(day => {
              const firstPeriodTimeSlot = 0; // Period 1 (index 0)
              
              // Check if Class Teacher is available for the first period on this Day
              if (teacherAvailability[classTeacher.id] && 
                  teacherAvailability[classTeacher.id][day] && 
                  teacherAvailability[classTeacher.id][day][firstPeriodTimeSlot] && 
                  teacherPeriodCounts[classTeacher.id] < (classTeacher.periodLimit || 35)) {
                
                // Assign the class teacher's primary subject to the first period
                updateScheduleState(
                  state, 
                  className, 
                  day, 
                  firstPeriodTimeSlot, 
                  classTeacherPrimarySubject, 
                  classTeacher.id, 
                  classTeacher.name
                );
                
                // Mark teacher as occupied
                markTeacherOccupied(classTeacher.id, day, firstPeriodTimeSlot);
                teacherPeriodCounts[classTeacher.id]++;
                
                console.log(`✅ ${classTeacher.name} assigned first period on ${day} for ${className} (${classTeacherPrimarySubject})`);
              } else {
                console.warn(`⚠️ Class Teacher ${classTeacher.name} not available for first period ${day} Period 1`);
              }
            });
          }
        }
      });

      // === PHASE 2: FILL REMAINING PERIODS ===
      console.log('📚 Phase 2: Filling Remaining Periods with Subject Assignments');
      
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        const workingDays = config.includeSaturday ? allDays : days;
        
        console.log(`\n🏫 Processing ${className}`);
        
        // Create a list of all periods that need to be filled for each subject
        const subjectPeriodQueue: Array<{subject: string, teacherId: string, periodsNeeded: number}> = [];
        
        config.subjectAssignments.forEach(assignment => {
          // Count already assigned periods for this subject
          let assignedPeriods = 0;
          workingDays.forEach(day => {
            const daySchedule = state.timetables[className][day];
            daySchedule.forEach(period => {
              if (period && period.subject === assignment.subject) {
                assignedPeriods++;
              }
            });
          });
          
          const periodsNeeded = assignment.periodsPerWeek - assignedPeriods;
          if (periodsNeeded > 0) {
            subjectPeriodQueue.push({
              subject: assignment.subject,
              teacherId: assignment.teacherId,
              periodsNeeded: periodsNeeded
            });
          }
        });

        // Sort subjects: activities first for better distribution, then by periods needed
        subjectPeriodQueue.sort((a, b) => {
          const aIsActivity = activitySubjects.includes(a.subject);
          const bIsActivity = activitySubjects.includes(b.subject);
          if (aIsActivity && !bIsActivity) return -1;
          if (!aIsActivity && bIsActivity) return 1;
          return b.periodsNeeded - a.periodsNeeded; // More periods first
        });

        // Fill remaining periods for each subject
        subjectPeriodQueue.forEach(item => {
          const teacher = teachers.find(t => t.id === item.teacherId);
          if (!teacher) return;

          let periodsAssigned = 0;
          let attempts = 0;
          const maxAttempts = workingDays.length * 10; // Prevent infinite loops

          while (periodsAssigned < item.periodsNeeded && attempts < maxAttempts) {
            attempts++;
            
            // Try each day
            for (const day of workingDays) {
              if (periodsAssigned >= item.periodsNeeded) break;
              
              const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
              
              // Try each period (including first period if not already occupied)
              for (let period = 0; period < periodsForDay; period++) {
                if (periodsAssigned >= item.periodsNeeded) break;
                
                // Check if this slot is empty and we can place this subject here
                if (state.timetables[className][day][period] === null &&
                    canPlacePeriod(state, className, day, period, item.subject, item.teacherId, teachers)) {
                  
                  // Check if teacher has reached period limit
                  if (teacherPeriodCounts[teacher.id] >= (teacher.periodLimit || 35)) {
                    // Find alternative teacher for this subject
                    const alternativeTeacher = teachers.find(t => 
                      t.id !== teacher.id && 
                      t.subjects.includes(item.subject) &&
                      teacherPeriodCounts[t.id] < (t.periodLimit || 35)
                    );
                    
                    if (alternativeTeacher && canPlacePeriod(state, className, day, period, item.subject, alternativeTeacher.id, teachers)) {
                      updateScheduleState(state, className, day, period, item.subject, alternativeTeacher.id, alternativeTeacher.name);
                      teacherPeriodCounts[alternativeTeacher.id]++;
                      periodsAssigned++;
                      console.log(`🔄 ${item.subject} assigned to ${alternativeTeacher.name} (alternative) on ${day} period ${period + 1} for ${className}`);
                    }
                  } else {
                    updateScheduleState(state, className, day, period, item.subject, teacher.id, teacher.name);
                    teacherPeriodCounts[teacher.id]++;
                    periodsAssigned++;
                    console.log(`📖 ${item.subject} assigned to ${teacher.name} on ${day} period ${period + 1} for ${className}`);
                  }
                }
              }
            }
          }
          
          console.log(`${className} - ${item.subject}: Assigned ${periodsAssigned}/${item.periodsNeeded} periods`);
        });

        // Fill remaining empty slots with free periods (avoiding consecutive free periods)
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
        const assignedClass = classConfigs.find(c => c.classTeacherId === teacher.id);
        const classTeacherInfo = assignedClass ? `${assignedClass.class}${assignedClass.division}` : 'No';
        console.log(`${status} ${teacher.name}: ${totalPeriods}/${limit} periods (Class Teacher: ${classTeacherInfo})`);
      });

      console.log('\n🎯 Enhanced Timetable Generation completed successfully!');

      resolve({ 
        timetables: state.timetables, 
        teacherSchedules: teacherTimetables,
        days: allDays 
      });
    });
  }, []);

  return { generateTimetables };
};
