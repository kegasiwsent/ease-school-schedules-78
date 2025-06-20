
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
    return new Promise((resolve, reject) => {
      try {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const allDays = [...days];
        
        // Add Saturday if any class includes it
        const hasSaturday = classConfigs.some(config => config.includeSaturday);
        if (hasSaturday) {
          allDays.push('Saturday');
        }

        console.log('🎯 Starting Enhanced Timetable Generation with Main/Extra Subjects');
        console.log('📊 Classes:', classConfigs.map(c => `${c.class}${c.division}`));
        console.log('👨‍🏫 Teachers:', teachers.map(t => t.name));

        // Initialize timetable structure
        const timetables: { [className: string]: { [day: string]: (any | null)[] } } = {};
        const teacherSchedules: { [teacherId: string]: { [day: string]: (string | null)[] } } = {};
        const teacherAvailability: { [teacherId: string]: { [day: string]: { [period: number]: boolean } } } = {};

        // Initialize class timetables
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          timetables[className] = {};
          
          allDays.forEach(day => {
            const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
            timetables[className][day] = Array(periodsForDay).fill(null);
          });
        });

        // Initialize teacher schedules and availability
        teachers.forEach(teacher => {
          teacherSchedules[teacher.id] = {};
          teacherAvailability[teacher.id] = {};
          
          allDays.forEach(day => {
            const maxPeriodsForDay = day === 'Saturday' 
              ? Math.max(...classConfigs.filter(c => c.includeSaturday).map(c => c.saturdayPeriods))
              : Math.max(...classConfigs.map(c => c.weekdayPeriods));
            
            const periods = maxPeriodsForDay || (day === 'Saturday' ? 4 : 7);
            teacherSchedules[teacher.id][day] = Array(periods).fill(null);
            teacherAvailability[teacher.id][day] = {};
            
            // Initialize all periods as available
            for (let period = 0; period < periods; period++) {
              teacherAvailability[teacher.id][day][period] = true;
            }
          });
        });

        // Helper functions
        const getClassTeacher = (className: string): Teacher | null => {
          const config = classConfigs.find(c => `${c.class}${c.division}` === className);
          if (!config || !config.classTeacherId) return null;
          return teachers.find(teacher => teacher.id === config.classTeacherId) || null;
        };

        const getTeacherPrimarySubject = (teacher: Teacher, classConfig: ClassConfig): string | null => {
          // Find main subjects this teacher can teach for this class
          const availableMainSubjects = (teacher.mainSubjects || []).filter(subject => 
            classConfig.subjectAssignments.some(assignment => assignment.subject === subject && assignment.teacherId === teacher.id)
          );
          
          if (availableMainSubjects.length > 0) {
            return availableMainSubjects[0];
          }
          
          // If no main subjects, return first available subject
          const availableSubjects = teacher.subjects.filter(subject =>
            classConfig.subjectAssignments.some(assignment => assignment.subject === subject && assignment.teacherId === teacher.id)
          );
          
          return availableSubjects.length > 0 ? availableSubjects[0] : null;
        };

        const markTeacherOccupied = (teacherId: string, day: string, period: number, className: string) => {
          if (teacherAvailability[teacherId] && teacherAvailability[teacherId][day]) {
            teacherAvailability[teacherId][day][period] = false;
            teacherSchedules[teacherId][day][period] = className;
          }
        };

        const isTeacherAvailable = (teacherId: string, day: string, period: number): boolean => {
          return teacherAvailability[teacherId]?.[day]?.[period] === true;
        };

        // === PHASE 1: ASSIGN CLASS TEACHERS TO FIRST PERIODS ===
        console.log('📋 Phase 1: Assigning Class Teachers to First Period');
        
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          const classTeacher = getClassTeacher(className);
          
          if (classTeacher) {
            const primarySubject = getTeacherPrimarySubject(classTeacher, config);
            
            if (primarySubject) {
              const workingDays = config.includeSaturday ? allDays : days;
              
              workingDays.forEach(day => {
                const firstPeriod = 0; // Period 1 (index 0)
                
                // Check if class teacher is available for first period
                if (isTeacherAvailable(classTeacher.id, day, firstPeriod)) {
                  // Assign class teacher's primary subject to first period
                  timetables[className][day][firstPeriod] = {
                    subject: primarySubject,
                    teacher: classTeacher.name,
                    teacherId: classTeacher.id
                  };
                  
                  // Mark teacher as occupied
                  markTeacherOccupied(classTeacher.id, day, firstPeriod, className);
                  
                  console.log(`✅ ${classTeacher.name} assigned first period on ${day} for ${className} (${primarySubject})`);
                } else {
                  console.warn(`⚠️ Class Teacher ${classTeacher.name} not available for first period ${day}`);
                }
              });
            } else {
              console.warn(`⚠️ No primary subject found for class teacher ${classTeacher.name} in ${className}`);
            }
          } else {
            console.warn(`⚠️ No class teacher assigned for ${className}`);
          }
        });

        // === PHASE 2: FILL MAIN SUBJECTS (PERIODS 2-4 ON WEEKDAYS, 1-2 ON SATURDAY) ===
        console.log('📚 Phase 2: Filling Main Subjects');
        
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          const workingDays = config.includeSaturday ? allDays : days;
          
          console.log(`\n🏫 Processing Main Subjects for ${className}`);
          
          // Create main subject assignment queue
          const mainSubjectQueue: Array<{subject: string, teacherId: string, periodsNeeded: number}> = [];
          
          config.subjectAssignments.forEach(assignment => {
            if (assignment.isMainSubject) {
              // Count already assigned periods
              let assignedPeriods = 0;
              workingDays.forEach(day => {
                const daySchedule = timetables[className][day];
                daySchedule.forEach(period => {
                  if (period && period.subject === assignment.subject) {
                    assignedPeriods++;
                  }
                });
              });
              
              const periodsNeeded = assignment.periodsPerWeek - assignedPeriods;
              if (periodsNeeded > 0) {
                mainSubjectQueue.push({
                  subject: assignment.subject,
                  teacherId: assignment.teacherId,
                  periodsNeeded: periodsNeeded
                });
              }
            }
          });

          // Fill main subjects in early periods
          mainSubjectQueue.forEach(item => {
            const teacher = teachers.find(t => t.id === item.teacherId);
            if (!teacher) return;

            let periodsAssigned = 0;
            let attempts = 0;
            const maxAttempts = workingDays.length * 10;

            while (periodsAssigned < item.periodsNeeded && attempts < maxAttempts) {
              attempts++;
              
              for (const day of workingDays) {
                if (periodsAssigned >= item.periodsNeeded) break;
                
                const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
                const mainPeriodLimit = day === 'Saturday' ? 2 : 4; // Main subjects in periods 1-4 on weekdays, 1-2 on Saturday
                
                for (let period = 0; period < Math.min(periodsForDay, mainPeriodLimit); period++) {
                  if (periodsAssigned >= item.periodsNeeded) break;
                  
                  // Check if this slot is empty and teacher is available
                  if (timetables[className][day][period] === null && 
                      isTeacherAvailable(item.teacherId, day, period)) {
                    
                    // Check if subject already exists on this day
                    const subjectAlreadyOnDay = timetables[className][day].some(slot => 
                      slot && slot.subject === item.subject
                    );
                    
                    if (!subjectAlreadyOnDay) {
                      // Assign the period
                      timetables[className][day][period] = {
                        subject: item.subject,
                        teacher: teacher.name,
                        teacherId: teacher.id
                      };
                      
                      markTeacherOccupied(teacher.id, day, period, className);
                      periodsAssigned++;
                      
                      console.log(`📖 Main Subject ${item.subject} assigned to ${teacher.name} on ${day} period ${period + 1} for ${className}`);
                    }
                  }
                }
              }
            }
            
            console.log(`${className} - Main Subject ${item.subject}: Assigned ${periodsAssigned}/${item.periodsNeeded} periods`);
          });
        });

        // === PHASE 3: FILL EXTRA SUBJECTS (PERIODS 5+ ON WEEKDAYS, 3+ ON SATURDAY) ===
        console.log('🎨 Phase 3: Filling Extra Subjects');
        
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          const workingDays = config.includeSaturday ? allDays : days;
          
          console.log(`\n🏫 Processing Extra Subjects for ${className}`);
          
          // Create extra subject assignment queue
          const extraSubjectQueue: Array<{subject: string, teacherId: string, periodsNeeded: number}> = [];
          
          config.subjectAssignments.forEach(assignment => {
            if (!assignment.isMainSubject) {
              // Count already assigned periods
              let assignedPeriods = 0;
              workingDays.forEach(day => {
                const daySchedule = timetables[className][day];
                daySchedule.forEach(period => {
                  if (period && period.subject === assignment.subject) {
                    assignedPeriods++;
                  }
                });
              });
              
              const periodsNeeded = assignment.periodsPerWeek - assignedPeriods;
              if (periodsNeeded > 0) {
                extraSubjectQueue.push({
                  subject: assignment.subject,
                  teacherId: assignment.teacherId,
                  periodsNeeded: periodsNeeded
                });
              }
            }
          });

          // Sort extra subjects to avoid continuous scheduling
          extraSubjectQueue.sort((a, b) => b.periodsNeeded - a.periodsNeeded);

          // Fill extra subjects in later periods with distribution
          extraSubjectQueue.forEach(item => {
            const teacher = teachers.find(t => t.id === item.teacherId);
            if (!teacher) return;

            let periodsAssigned = 0;
            let attempts = 0;
            const maxAttempts = workingDays.length * 10;

            while (periodsAssigned < item.periodsNeeded && attempts < maxAttempts) {
              attempts++;
              
              for (const day of workingDays) {
                if (periodsAssigned >= item.periodsNeeded) break;
                
                const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
                const extraPeriodStart = day === 'Saturday' ? 2 : 4; // Extra subjects start from period 5 on weekdays, 3 on Saturday
                
                for (let period = extraPeriodStart; period < periodsForDay; period++) {
                  if (periodsAssigned >= item.periodsNeeded) break;
                  
                  // Check if this slot is empty and teacher is available
                  if (timetables[className][day][period] === null && 
                      isTeacherAvailable(item.teacherId, day, period)) {
                    
                    // Check if subject already exists on this day
                    const subjectAlreadyOnDay = timetables[className][day].some(slot => 
                      slot && slot.subject === item.subject
                    );
                    
                    // Check if previous period has same type of subject (to avoid continuous extra subjects)
                    const previousPeriodIsExtra = period > extraPeriodStart && 
                      timetables[className][day][period - 1] &&
                      config.subjectAssignments.find(a => 
                        a.subject === timetables[className][day][period - 1]?.subject && 
                        !a.isMainSubject
                      );
                    
                    if (!subjectAlreadyOnDay && !previousPeriodIsExtra) {
                      // Assign the period
                      timetables[className][day][period] = {
                        subject: item.subject,
                        teacher: teacher.name,
                        teacherId: teacher.id
                      };
                      
                      markTeacherOccupied(teacher.id, day, period, className);
                      periodsAssigned++;
                      
                      console.log(`🎨 Extra Subject ${item.subject} assigned to ${teacher.name} on ${day} period ${period + 1} for ${className}`);
                    }
                  }
                }
              }
            }
            
            console.log(`${className} - Extra Subject ${item.subject}: Assigned ${periodsAssigned}/${item.periodsNeeded} periods`);
          });

          // Fill any remaining empty slots with main subjects if available
          workingDays.forEach(day => {
            const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
            
            for (let period = 0; period < periodsForDay; period++) {
              if (timetables[className][day][period] === null) {
                console.log(`${className} - Free period at ${day} period ${period + 1}`);
              }
            }
          });
        });

        // Generate teacher-specific timetables
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
        Object.entries(timetables).forEach(([className, classTimetable]) => {
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

        console.log('🎯 Enhanced Timetable Generation with Main/Extra Subjects completed successfully!');
        
        resolve({ 
          timetables: timetables, 
          teacherSchedules: teacherTimetables,
          days: allDays 
        });
        
      } catch (error) {
        console.error('❌ Error in timetable generation:', error);
        reject(error);
      }
    });
  }, []);

  return { generateTimetables };
};
