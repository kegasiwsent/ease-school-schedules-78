
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

// NEW: Advanced distribution algorithms
export const calculateSubjectDistributionScore = (
  state: ScheduleState,
  className: string,
  subject: string,
  day: string,
  period: number,
  totalPeriodsNeeded: number,
  workingDays: string[]
): number => {
  let score = 0;
  
  // Prefer spreading subjects across different days
  const subjectDayCount = state.subjectDayCount[className]?.[subject] || {};
  const daysWithSubject = Object.keys(subjectDayCount).length;
  const idealDaysToSpread = Math.min(totalPeriodsNeeded, workingDays.length);
  
  if (daysWithSubject < idealDaysToSpread) {
    score += 10; // Bonus for spreading to new days
  }
  
  // Prefer different time periods for variety
  const timeSlotUsage = getTimeSlotUsageForSubject(state, className, subject, period);
  score += (5 - timeSlotUsage); // Less used time slots get higher scores
  
  // Avoid placing same subject at same time across days
  const sameTimeSlotUsage = getSameTimeSlotUsageAcrossDays(state, className, subject, period);
  score -= sameTimeSlotUsage * 3; // Penalty for repetitive time slots
  
  return score;
};

export const getTimeSlotUsageForSubject = (
  state: ScheduleState,
  className: string,
  subject: string,
  period: number
): number => {
  let usage = 0;
  Object.keys(state.timetables[className] || {}).forEach(day => {
    const slot = state.timetables[className][day][period];
    if (slot && slot.subject === subject) {
      usage++;
    }
  });
  return usage;
};

export const getSameTimeSlotUsageAcrossDays = (
  state: ScheduleState,
  className: string,
  subject: string,
  period: number
): number => {
  let usage = 0;
  Object.keys(state.timetables[className] || {}).forEach(day => {
    const slot = state.timetables[className][day][period];
    if (slot && slot.subject === subject) {
      usage++;
    }
  });
  return usage;
};

export const getOptimalTimeSlots = (
  state: ScheduleState,
  className: string,
  subject: string,
  day: string,
  periodsForDay: number,
  totalPeriodsNeeded: number,
  workingDays: string[],
  isMainSubject: boolean
): number[] => {
  const availableSlots: Array<{period: number, score: number}> = [];
  
  const periodRange = isMainSubject 
    ? (day === 'Saturday' ? [0, 1] : [0, 1, 2, 3]) // Main subjects in early periods
    : (day === 'Saturday' ? [2, 3] : [4, 5, 6]); // Extra subjects in later periods
  
  for (let period = periodRange[0]; period <= Math.min(periodRange[1], periodsForDay - 1); period++) {
    if (state.timetables[className][day][period] === null) {
      const score = calculateSubjectDistributionScore(
        state, className, subject, day, period, totalPeriodsNeeded, workingDays
      );
      availableSlots.push({ period, score });
    }
  }
  
  // Sort by score (highest first) and return periods
  return availableSlots
    .sort((a, b) => b.score - a.score)
    .map(slot => slot.period);
};

export const getBalancedDayDistribution = (
  state: ScheduleState,
  className: string,
  subject: string,
  workingDays: string[],
  remainingPeriods: number
): string[] => {
  const subjectDayCount = state.subjectDayCount[className]?.[subject] || {};
  
  // Calculate target distribution
  const periodsPerDay = Math.floor(remainingPeriods / workingDays.length);
  const extraPeriods = remainingPeriods % workingDays.length;
  
  const dayPriority = workingDays.map(day => ({
    day,
    currentCount: subjectDayCount[day] || 0,
    targetCount: periodsPerDay + (extraPeriods > 0 ? 1 : 0),
    priority: 0
  }));
  
  // Calculate priority scores
  dayPriority.forEach(item => {
    item.priority = item.targetCount - item.currentCount;
  });
  
  // Sort by priority (highest first) and return days
  return dayPriority
    .filter(item => item.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .map(item => item.day);
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const getOptimalDayForSubject = (
  state: ScheduleState,
  className: string,
  subject: string,
  workingDays: string[],
  remainingPeriods: number
): string[] => {
  return getBalancedDayDistribution(state, className, subject, workingDays, remainingPeriods);
};
