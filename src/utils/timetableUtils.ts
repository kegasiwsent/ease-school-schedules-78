import type { ScheduleState, Teacher, ClassConfig } from '@/types/timetable';

// Activity subjects that should be distributed
export const activitySubjects = ['PE', 'Computer', 'SST'];

// Core subjects that should be prioritized for class teachers in 1st period
export const coreSubjects = ['Maths', 'Science', 'English'];

export const canPlacePeriod = (
  state: ScheduleState,
  className: string,
  day: string,
  period: number,
  subject: string,
  teacherId: string,
  teachers: Teacher[]
): boolean => {
  // Check if slot is already occupied
  if (state.timetables[className][day][period] !== null) return false;
  if (state.teacherSchedules[teacherId][day][period] !== null) return false;

  // Check teacher period limit
  const teacher = teachers.find(t => t.id === teacherId);
  if (teacher && teacher.periodLimit) {
    const currentTotalPeriods = Object.values(state.teacherSchedules[teacherId])
      .flat()
      .filter(slot => slot !== null).length;
    
    if (currentTotalPeriods >= teacher.periodLimit) {
      return false;
    }
  }

  // NEW RULE: Only one period per day for each subject
  const daySchedule = state.timetables[className][day];
  const subjectAlreadyScheduledToday = daySchedule.some(slot => slot && slot.subject === subject);
  if (subjectAlreadyScheduledToday) {
    return false;
  }

  // Check teacher fatigue - no more than 2 consecutive periods
  const teacherConsecutiveCount = state.teacherConsecutive[teacherId]?.[day] || 0;
  if (teacherConsecutiveCount >= 2) {
    // Teacher needs a break - check if previous period was free
    if (period > 0 && state.teacherSchedules[teacherId][day][period - 1] !== null) {
      return false;
    }
  }

  // Modified: Since we only allow one period per day per subject, remove consecutive subject check
  // This is now handled by the one-period-per-day rule above

  return true;
};

export const canPlaceFreePeriod = (
  state: ScheduleState,
  className: string,
  day: string,
  period: number
): boolean => {
  // Don't place free periods back-to-back
  if (period > 0 && state.timetables[className][day][period - 1] === null) {
    return false; // Previous period is also free
  }
  if (period < state.timetables[className][day].length - 1 && 
      state.timetables[className][day][period + 1] === null) {
    return false; // Next period is also free
  }
  
  return true;
};

export const updateScheduleState = (
  state: ScheduleState,
  className: string,
  day: string,
  period: number,
  subject: string,
  teacherId: string,
  teacherName: string
): void => {
  // Place the period
  state.timetables[className][day][period] = {
    subject,
    teacher: teacherName,
    teacherId
  };
  state.teacherSchedules[teacherId][day][period] = className;

  // Update tracking
  if (!state.subjectLastPlaced[className]) state.subjectLastPlaced[className] = {};
  if (!state.subjectLastPlaced[className][subject]) state.subjectLastPlaced[className][subject] = {};
  state.subjectLastPlaced[className][subject][day] = period;

  if (!state.subjectDayCount[className]) state.subjectDayCount[className] = {};
  if (!state.subjectDayCount[className][subject]) state.subjectDayCount[className][subject] = {};
  state.subjectDayCount[className][subject][day] = (state.subjectDayCount[className][subject][day] || 0) + 1;

  // Update teacher consecutive count
  if (!state.teacherConsecutive[teacherId]) state.teacherConsecutive[teacherId] = {};
  if (!state.teacherConsecutive[teacherId][day]) state.teacherConsecutive[teacherId][day] = 0;
  
  // Check if this extends a consecutive sequence
  if (period > 0 && state.teacherSchedules[teacherId][day][period - 1] !== null) {
    state.teacherConsecutive[teacherId][day]++;
  } else {
    state.teacherConsecutive[teacherId][day] = 1;
  }

  // Reset consecutive count if there's a gap after this period
  if (period + 1 < state.teacherSchedules[teacherId][day].length && 
      state.teacherSchedules[teacherId][day][period + 1] === null) {
    state.teacherConsecutive[teacherId][day] = 0;
  }
};

// NEW: Helper function to get even distribution of subjects across days
export const getOptimalDayForSubject = (
  state: ScheduleState,
  className: string,
  subject: string,
  workingDays: string[],
  remainingPeriods: number
): string[] => {
  const subjectDayCount = state.subjectDayCount[className]?.[subject] || {};
  
  // Calculate how many days this subject should be spread across
  const targetDays = Math.min(remainingPeriods, workingDays.length);
  
  // Find days where this subject hasn't been placed yet
  const availableDays = workingDays.filter(day => !subjectDayCount[day]);
  
  // If we have enough available days, use them
  if (availableDays.length >= targetDays) {
    return availableDays.slice(0, targetDays);
  }
  
  // Otherwise, find days with the least occurrences of this subject
  const daysByCount = workingDays
    .map(day => ({ day, count: subjectDayCount[day] || 0 }))
    .sort((a, b) => a.count - b.count);
  
  return daysByCount.slice(0, targetDays).map(item => item.day);
};
