
export interface Teacher {
  id: string;
  name: string;
  subjects: string[]; // Keep for backward compatibility
  mainSubjects: string[];
  extraSubjects: string[];
  contactInfo?: string;
  assignedPeriods: { [subject: string]: number };
  periodLimit?: number;
  isClassTeacher: boolean;
  classTeacherOf?: string;
}

export interface SubjectAssignment {
  subject: string;
  periodsPerWeek: number;
  teacherId: string;
  isMainSubject: boolean;
}

export interface ClassConfig {
  class: string;
  division: string;
  classTeacherId?: string;
  selectedSubjects: string[];
  selectedMainSubjects: string[];
  selectedExtraSubjects: string[];
  subjectAssignments: SubjectAssignment[];
  periodsPerWeek: number;
  weekdayPeriods: number;
  saturdayPeriods: number;
  includeSaturday: boolean;
}

export interface PeriodSlot {
  subject: string;
  teacher: string;
  teacherId: string;
}

export interface ScheduleState {
  timetables: { [className: string]: { [day: string]: (PeriodSlot | null)[] } };
  teacherSchedules: { [teacherId: string]: { [day: string]: (string | null)[] } };
  subjectLastPlaced: { [className: string]: { [subject: string]: { [day: string]: number } } };
  teacherConsecutive: { [teacherId: string]: { [day: string]: number } };
  subjectDayCount: { [className: string]: { [subject: string]: { [day: string]: number } } };
}

export interface GeneratedTimetables {
  timetables: { [className: string]: { [day: string]: (PeriodSlot | null)[] } };
  teacherSchedules: { [teacherId: string]: { [day: string]: ({ class: string; subject: string } | null)[] } };
  days: string[];
}
