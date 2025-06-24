
import { useCallback } from 'react';
import type { Teacher, ClassConfig, ScheduleState, GeneratedTimetables } from '@/types/timetable';
import { 
  canPlacePeriod, 
  updateScheduleState, 
  activitySubjects, 
  coreSubjects,
  canPlaceFreePeriod,
  getOptimalTimeSlots,
  getBalancedDayDistribution,
  shuffleArray
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

        console.log('🎯 Starting Enhanced Timetable Generation with Advanced Distribution');
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

        // === PHASE 1: SMART DISTRIBUTION OF CLASS TEACHERS ===
        console.log('📋 Phase 1: Smart Distribution of Class Teachers');
        
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          const classTeacher = getClassTeacher(className);
          
          if (classTeacher) {
            const primarySubject = getTeacherPrimarySubject(classTeacher, config);
            
            if (primarySubject) {
              const workingDays = config.includeSaturday ? allDays : days;
              
              // Distribute class teacher's periods across different time slots
              const shuffledDays = shuffleArray(workingDays);
              const timeSlots = [0, 1, 2]; // Vary the time slots for class teachers
              
              shuffledDays.forEach((day, dayIndex) => {
                const timeSlot = timeSlots[dayIndex % timeSlots.length];
                
                // Check if class teacher is available for this time slot
                if (isTeacherAvailable(classTeacher.id, day, timeSlot) && 
                    timetables[className][day][timeSlot] === null) {
                  
                  // Assign class teacher's primary subject
                  timetables[className][day][timeSlot] = {
                    subject: primarySubject,
                    teacher: classTeacher.name,
                    teacherId: classTeacher.id
                  };
                  
                  // Mark teacher as occupied
                  markTeacherOccupied(classTeacher.id, day, timeSlot, className);
                  
                  console.log(`✅ ${classTeacher.name} assigned ${primarySubject} on ${day} period ${timeSlot + 1} for ${className}`);
                }
              });
            }
          }
        });

        // === PHASE 2: ADVANCED MAIN SUBJECTS DISTRIBUTION ===
        console.log('📚 Phase 2: Advanced Main Subjects Distribution');
        
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          const workingDays = config.includeSaturday ? allDays : days;
          
          console.log(`\n🏫 Processing Main Subjects for ${className}`);
          
          // Create main subject assignment queue with intelligent sorting
          const mainSubjectQueue: Array<{subject: string, teacherId: string, periodsNeeded: number, teacher: Teacher}> = [];
          
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
              const teacher = teachers.find(t => t.id === assignment.teacherId);
              
              if (periodsNeeded > 0 && teacher) {
                mainSubjectQueue.push({
                  subject: assignment.subject,
                  teacherId: assignment.teacherId,
                  periodsNeeded: periodsNeeded,
                  teacher: teacher
                });
              }
            }
          });

          // Sort by periods needed (descending) and shuffle subjects with same period count
          mainSubjectQueue.sort((a, b) => {
            if (a.periodsNeeded !== b.periodsNeeded) {
              return b.periodsNeeded - a.periodsNeeded;
            }
            return Math.random() - 0.5; // Random order for same period counts
          });

          // Distribute main subjects using advanced algorithm
          mainSubjectQueue.forEach(item => {
            let periodsAssigned = 0;
            const targetDays = getBalancedDayDistribution(
              { timetables, teacherSchedules, subjectLastPlaced: {}, teacherConsecutive: {}, subjectDayCount: {} },
              className,
              item.subject,
              workingDays,
              item.periodsNeeded
            );

            for (const day of shuffleArray(targetDays)) {
              if (periodsAssigned >= item.periodsNeeded) break;
              
              const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
              const optimalSlots = getOptimalTimeSlots(
                { timetables, teacherSchedules, subjectLastPlaced: {}, teacherConsecutive: {}, subjectDayCount: {} },
                className,
                item.subject,
                day,
                periodsForDay,
                item.periodsNeeded,
                workingDays,
                true
              );

              for (const period of optimalSlots) {
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
                      teacher: item.teacher.name,
                      teacherId: item.teacher.id
                    };
                    
                    markTeacherOccupied(item.teacher.id, day, period, className);
                    periodsAssigned++;
                    
                    console.log(`📖 Main Subject ${item.subject} assigned to ${item.teacher.name} on ${day} period ${period + 1} for ${className}`);
                  }
                }
              }
            }
            
            console.log(`${className} - Main Subject ${item.subject}: Assigned ${periodsAssigned}/${item.periodsNeeded} periods`);
          });
        });

        // === PHASE 3: SMART EXTRA SUBJECTS DISTRIBUTION ===
        console.log('🎨 Phase 3: Smart Extra Subjects Distribution');
        
        classConfigs.forEach(config => {
          const className = `${config.class}${config.division}`;
          const workingDays = config.includeSaturday ? allDays : days;
          
          console.log(`\n🏫 Processing Extra Subjects for ${className}`);
          
          // Create extra subject assignment queue
          const extraSubjectQueue: Array<{subject: string, teacherId: string, periodsNeeded: number, teacher: Teacher}> = [];
          
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
              const teacher = teachers.find(t => t.id === assignment.teacherId);
              
              if (periodsNeeded > 0 && teacher) {
                extraSubjectQueue.push({
                  subject: assignment.subject,
                  teacherId: assignment.teacherId,
                  periodsNeeded: periodsNeeded,
                  teacher: teacher
                });
              }
            }
          });

          // Shuffle extra subjects to avoid patterns
          const shuffledExtraQueue = shuffleArray(extraSubjectQueue);

          // Fill extra subjects with advanced distribution
          shuffledExtraQueue.forEach(item => {
            let periodsAssigned = 0;
            const shuffledDays = shuffleArray(workingDays);

            for (const day of shuffledDays) {
              if (periodsAssigned >= item.periodsNeeded) break;
              
              const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
              const extraPeriodStart = day === 'Saturday' ? 2 : 4;
              
              // Create varied time slots for extra subjects
              const availableSlots = [];
              for (let period = extraPeriodStart; period < periodsForDay; period++) {
                availableSlots.push(period);
              }
              
              const shuffledSlots = shuffleArray(availableSlots);
              
              for (const period of shuffledSlots) {
                if (periodsAssigned >= item.periodsNeeded) break;
                
                // Check if this slot is empty and teacher is available
                if (timetables[className][day][period] === null && 
                    isTeacherAvailable(item.teacherId, day, period)) {
                  
                  // Check if subject already exists on this day
                  const subjectAlreadyOnDay = timetables[className][day].some(slot => 
                    slot && slot.subject === item.subject
                  );
                  
                  // Avoid consecutive extra subjects of same type
                  const isPreviousSlotSimilarExtra = period > extraPeriodStart && 
                    timetables[className][day][period - 1] &&
                    activitySubjects.includes(timetables[className][day][period - 1]?.subject) &&
                    activitySubjects.includes(item.subject);
                  
                  if (!subjectAlreadyOnDay && !isPreviousSlotSimilarExtra) {
                    // Assign the period
                    timetables[className][day][period] = {
                      subject: item.subject,
                      teacher: item.teacher.name,
                      teacherId: item.teacher.id
                    };
                    
                    markTeacherOccupied(item.teacher.id, day, period, className);
                    periodsAssigned++;
                    
                    console.log(`🎨 Extra Subject ${item.subject} assigned to ${item.teacher.name} on ${day} period ${period + 1} for ${className}`);
                  }
                }
              }
            }
            
            console.log(`${className} - Extra Subject ${item.subject}: Assigned ${periodsAssigned}/${item.periodsNeeded} periods`);
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

        console.log('🎯 Advanced Timetable Generation with Smart Distribution completed successfully!');
        
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
