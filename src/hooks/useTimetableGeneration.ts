
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

      // Initialize timetables for all classes
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

      // Initialize teacher schedules and period counts
      teachers.forEach(teacher => {
        state.teacherSchedules[teacher.id] = {};
        teacherPeriodCounts[teacher.id] = 0;
        state.teacherConsecutive[teacher.id] = {};
        
        allDays.forEach(day => {
          const maxPeriodsForDay = day === 'Saturday' 
            ? Math.max(...classConfigs.filter(c => c.includeSaturday).map(c => c.saturdayPeriods))
            : Math.max(...classConfigs.map(c => c.weekdayPeriods));
          state.teacherSchedules[teacher.id][day] = Array(maxPeriodsForDay || (day === 'Saturday' ? 4 : 7)).fill(null);
          state.teacherConsecutive[teacher.id][day] = 0;
        });
      });

      // Helper function to get class teacher for a specific class
      const getClassTeacher = (className: string): Teacher | null => {
        const config = classConfigs.find(c => `${c.class}${c.division}` === className);
        if (!config || !config.classTeacherId) return null;
        
        return teachers.find(teacher => teacher.id === config.classTeacherId) || null;
      };

      // Helper function to get available subject for class teacher
      const getAvailableSubject = (teacherSubjects: string[], classAssignments: any[], usedToday: Set<string>): string | null => {
        // First try core subjects that haven't been used today
        const availableCoreSubjects = coreSubjects.filter(subject => 
          teacherSubjects.includes(subject) && 
          !usedToday.has(subject) &&
          classAssignments.some(assignment => assignment.subject === subject)
        );
        
        if (availableCoreSubjects.length > 0) {
          return availableCoreSubjects[0];
        }
        
        // If no core subjects available, try any other subject
        const availableSubjects = teacherSubjects.filter(subject => 
          !usedToday.has(subject) &&
          classAssignments.some(assignment => assignment.subject === subject)
        );
        
        return availableSubjects.length > 0 ? availableSubjects[0] : null;
      };

      console.log('🎯 Starting Enhanced Timetable Generation Algorithm');
      
      // STEP 1: Class Teacher First Period Assignment
      console.log('📋 Step 1: Assigning Class Teachers to First Period');
      
      allDays.forEach(day => {
        console.log(`📅 Processing ${day}`);
        
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          const classTeacher = getClassTeacher(className);
          
          if (classTeacher && teacherPeriodCounts[classTeacher.id] < (classTeacher.periodLimit || 35)) {
            const usedToday = new Set<string>();
            const availableSubject = getAvailableSubject(
              classTeacher.subjects, 
              config.subjectAssignments,
              usedToday
            );
            
            if (availableSubject && 
                state.timetables[className][day][0] === null && 
                state.teacherSchedules[classTeacher.id][day][0] === null) {
              
              updateScheduleState(
                state, 
                className, 
                day, 
                0, 
                availableSubject, 
                classTeacher.id, 
                classTeacher.name
              );
              
              teacherPeriodCounts[classTeacher.id]++;
              console.log(`✅ ${classTeacher.name} assigned 1st period on ${day} for ${className} (${availableSubject})`);
            }
          }
        });
      });

      // STEP 2: Fill Remaining Periods for Each Class
      console.log('📚 Step 2: Filling Remaining Periods with Subject Assignments');
      
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

        // Distribute periods evenly across days and periods
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
              
              // Try each period (skip first period if it's already taken by class teacher)
              for (let period = 0; period < periodsForDay; period++) {
                if (periodsAssigned >= item.periodsNeeded) break;
                
                // Check if we can place this subject here
                if (canPlacePeriod(state, className, day, period, item.subject, item.teacherId, teachers)) {
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
