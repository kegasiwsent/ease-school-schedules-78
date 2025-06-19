
export interface Teacher {
  id: string;
  name: string;
  subjects: string[];
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
}

export interface ClassConfig {
  class: string;
  division: string;
  classTeacherId?: string;
  selectedSubjects: string[];
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
