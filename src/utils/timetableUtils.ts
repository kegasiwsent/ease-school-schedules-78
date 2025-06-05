
import type { ScheduleState, Teacher, ClassConfig } from '@/types/timetable';

// Activity subjects that should be distributed
export const activitySubjects = ['PE', 'Computer', 'SST'];

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

  // Check teacher fatigue - no more than 2 consecutive periods
  const teacherConsecutiveCount = state.teacherConsecutive[teacherId]?.[day] || 0;
  if (teacherConsecutiveCount >= 2) {
    // Teacher needs a break - check if previous period was free
    if (period > 0 && state.teacherSchedules[teacherId][day][period - 1] !== null) {
      return false;
    }
  }

  // Check subject consecutive periods - max 2 per day
  let consecutiveSubjectCount = 0;
  
  // Count consecutive periods before this slot
  for (let p = period - 1; p >= 0; p--) {
    const slot = state.timetables[className][day][p];
    if (slot && slot.subject === subject) {
      consecutiveSubjectCount++;
    } else {
      break;
    }
  }
  
  // Count consecutive periods after this slot
  for (let p = period + 1; p < state.timetables[className][day].length; p++) {
    const slot = state.timetables[className][day][p];
    if (slot && slot.subject === subject) {
      consecutiveSubjectCount++;
    } else {
      break;
    }
  }

  if (consecutiveSubjectCount >= 2) return false;

  // Check minimum gap rule - skip at least one period before placing same subject again
  const lastPlaced = state.subjectLastPlaced[className]?.[subject]?.[day] ?? -2;
  if (lastPlaced !== -2 && period - lastPlaced < 2) {
    // Only allow if we're placing the second consecutive period
    if (period - lastPlaced !== 1) return false;
    
    // Check if this would create more than 2 consecutive
    if (period + 1 < state.timetables[className][day].length) {
      const nextSlot = state.timetables[className][day][period + 1];
      if (nextSlot && nextSlot.subject === subject) return false;
    }
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
