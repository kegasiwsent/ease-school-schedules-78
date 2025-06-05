import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Users, BookOpen, Clock, Sparkles, ArrowRight, ArrowLeft, Edit, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from './TimetableDisplay';

interface Teacher {
  id: string;
  name: string;
  subjects: string[];
  contactInfo?: string;
  assignedPeriods: { [subject: string]: number };
}

interface SubjectAssignment {
  subject: string;
  periodsPerWeek: number;
  teacherId: string;
}

interface ClassConfig {
  class: string;
  division: string;
  selectedSubjects: string[];
  subjectAssignments: SubjectAssignment[];
  periodsPerWeek: number; // Total periods per week (Mon-Fri + Sat)
  weekdayPeriods: number; // Periods per day Monday-Friday
  saturdayPeriods: number; // Periods on Saturday
  includeSaturday: boolean;
}

interface PeriodSlot {
  subject: string;
  teacher: string;
  teacherId: string;
}

interface ScheduleState {
  timetables: { [className: string]: { [day: string]: (PeriodSlot | null)[] } };
  teacherSchedules: { [teacherId: string]: { [day: string]: (string | null)[] } };
  subjectLastPlaced: { [className: string]: { [subject: string]: { [day: string]: number } } };
  teacherConsecutive: { [teacherId: string]: { [day: string]: number } };
  subjectDayCount: { [className: string]: { [subject: string]: { [day: string]: number } } };
}

const TimetableGenerator = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<string[]>([]);
  const [newTeacherContact, setNewTeacherContact] = useState('');
  
  // Editing state
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherSubjects, setEditTeacherSubjects] = useState<string[]>([]);
  const [editTeacherContact, setEditTeacherContact] = useState('');
  
  // Step 2 & 3: Class Configuration
  const [classConfigs, setClassConfigs] = useState<ClassConfig[]>([]);
  const [currentClass, setCurrentClass] = useState('');
  const [currentDivision, setCurrentDivision] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [weekdayPeriods, setWeekdayPeriods] = useState(7); // Default 7 periods per day Monday-Friday
  const [saturdayPeriods, setSaturdayPeriods] = useState(4); // Default 4 periods on Saturday
  const [includeSaturday, setIncludeSaturday] = useState(false);
  
  // Step 4: Subject Assignments
  const [currentConfig, setCurrentConfig] = useState<ClassConfig | null>(null);
  
  // Step 5: Generated Timetables
  const [generatedTimetables, setGeneratedTimetables] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableSubjects = ['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE'];
  const classes = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const divisions = ['A', 'B', 'C', 'D'];

  // Activity subjects that should be distributed
  const activitySubjects = ['PE', 'Computer', 'SST'];

  // Calculate total periods per week
  const calculateTotalPeriods = () => {
    const weekdayTotal = weekdayPeriods * 5; // 5 weekdays
    const saturdayTotal = includeSaturday ? saturdayPeriods : 0;
    return weekdayTotal + saturdayTotal;
  };

  // Calculate total assigned periods for current configuration
  const getTotalAssignedPeriods = () => {
    if (!currentConfig) return 0;
    return currentConfig.subjectAssignments.reduce((total, assignment) => total + assignment.periodsPerWeek, 0);
  };

  // Check if periods exceed maximum
  const exceedsMaxPeriods = () => {
    const totalAssigned = getTotalAssignedPeriods();
    return totalAssigned > (currentConfig?.periodsPerWeek || 42);
  };

  // Helper function to get available periods for a teacher for a specific subject
  const getAvailablePeriodsForSubject = (teacher: Teacher, subject: string) => {
    const assignedForSubject = teacher.assignedPeriods[subject] || 0;
    return assignedForSubject;
  };

  // Helper function to check if teacher can take more periods for a subject
  const canTeacherTakeSubject = (teacher: Teacher, subject: string) => {
    return teacher.subjects.includes(subject);
  };

  // Enhanced scheduling constraints
  const canPlacePeriod = (
    state: ScheduleState,
    className: string,
    day: string,
    period: number,
    subject: string,
    teacherId: string
  ): boolean => {
    // Check if slot is already occupied
    if (state.timetables[className][day][period] !== null) return false;
    if (state.teacherSchedules[teacherId][day][period] !== null) return false;

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

  const updateScheduleState = (
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

  // Step 1: Teacher Management
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherName.trim() && newTeacherSubjects.length > 0) {
      const newTeacher: Teacher = {
        id: Date.now().toString(),
        name: newTeacherName.trim(),
        subjects: [...newTeacherSubjects],
        contactInfo: newTeacherContact.trim() || undefined,
        assignedPeriods: {}
      };
      setTeachers([...teachers, newTeacher]);
      setNewTeacherName('');
      setNewTeacherSubjects([]);
      setNewTeacherContact('');
      toast({
        title: "Teacher Added",
        description: `${newTeacher.name} has been added successfully.`,
      });
    }
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  const toggleTeacherSubject = (subject: string) => {
    setNewTeacherSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  // Edit teacher functionality
  const startEditingTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher.id);
    setEditTeacherName(teacher.name);
    setEditTeacherSubjects([...teacher.subjects]);
    setEditTeacherContact(teacher.contactInfo || '');
  };

  const cancelEditingTeacher = () => {
    setEditingTeacher(null);
    setEditTeacherName('');
    setEditTeacherSubjects([]);
    setEditTeacherContact('');
  };

  const saveEditingTeacher = () => {
    if (!editingTeacher || !editTeacherName.trim() || editTeacherSubjects.length === 0) return;

    setTeachers(prev => prev.map(teacher => {
      if (teacher.id === editingTeacher) {
        return {
          ...teacher,
          name: editTeacherName.trim(),
          subjects: [...editTeacherSubjects],
          contactInfo: editTeacherContact.trim() || undefined
        };
      }
      return teacher;
    }));

    setEditingTeacher(null);
    setEditTeacherName('');
    setEditTeacherSubjects([]);
    setEditTeacherContact('');

    toast({
      title: "Teacher Updated",
      description: "Teacher information has been updated successfully.",
    });
  };

  const toggleEditTeacherSubject = (subject: string) => {
    setEditTeacherSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  // Step 2-3: Class Configuration
  const handleStartClassConfig = () => {
    if (currentClass && currentDivision) {
      const totalPeriods = calculateTotalPeriods();
      
      const existingConfig = classConfigs.find(
        config => config.class === currentClass && config.division === currentDivision
      );
      
      if (existingConfig) {
        setCurrentConfig(existingConfig);
        setSelectedSubjects(existingConfig.selectedSubjects);
        setWeekdayPeriods(existingConfig.weekdayPeriods);
        setSaturdayPeriods(existingConfig.saturdayPeriods);
        setIncludeSaturday(existingConfig.includeSaturday);
      } else {
        const newConfig: ClassConfig = {
          class: currentClass,
          division: currentDivision,
          selectedSubjects: [],
          subjectAssignments: [],
          periodsPerWeek: totalPeriods,
          weekdayPeriods: weekdayPeriods,
          saturdayPeriods: saturdayPeriods,
          includeSaturday: includeSaturday
        };
        setCurrentConfig(newConfig);
        setSelectedSubjects([]);
      }
      setCurrentStep(4);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  // Step 4: Subject Assignment
  const handleSubjectAssignment = (subject: string, periodsPerWeek: number, teacherId: string) => {
    if (!currentConfig) return;

    const updatedConfig = { ...currentConfig };
    updatedConfig.selectedSubjects = selectedSubjects;
    updatedConfig.periodsPerWeek = calculateTotalPeriods();
    updatedConfig.weekdayPeriods = weekdayPeriods;
    updatedConfig.saturdayPeriods = saturdayPeriods;
    updatedConfig.includeSaturday = includeSaturday;
    
    const existingAssignment = updatedConfig.subjectAssignments.find(a => a.subject === subject);
    if (existingAssignment) {
      existingAssignment.periodsPerWeek = periodsPerWeek;
      existingAssignment.teacherId = teacherId;
    } else {
      updatedConfig.subjectAssignments.push({
        subject,
        periodsPerWeek,
        teacherId
      });
    }
    
    setCurrentConfig(updatedConfig);
  };

  const saveClassConfig = () => {
    if (!currentConfig) return;

    if (exceedsMaxPeriods()) {
      toast({
        title: "Period Limit Exceeded",
        description: `Total assigned periods (${getTotalAssignedPeriods()}) exceed the maximum (${currentConfig.periodsPerWeek}).`,
        variant: "destructive"
      });
      return;
    }

    const updatedConfigs = classConfigs.filter(
      config => !(config.class === currentConfig.class && config.division === currentConfig.division)
    );
    updatedConfigs.push(currentConfig);
    setClassConfigs(updatedConfigs);
    
    // Update teacher assigned periods per subject
    const updatedTeachers = teachers.map(teacher => {
      const subjectPeriods: { [subject: string]: number } = {};
      
      updatedConfigs.forEach(config => {
        config.subjectAssignments
          .filter(assignment => assignment.teacherId === teacher.id)
          .forEach(assignment => {
            subjectPeriods[assignment.subject] = (subjectPeriods[assignment.subject] || 0) + assignment.periodsPerWeek;
          });
      });
      
      return { ...teacher, assignedPeriods: subjectPeriods };
    });
    setTeachers(updatedTeachers);

    toast({
      title: "Class Configuration Saved",
      description: `Configuration for ${currentConfig.class}${currentConfig.division} has been saved.`,
    });
    
    setCurrentStep(2);
    setCurrentConfig(null);
    setCurrentClass('');
    setCurrentDivision('');
    setSelectedSubjects([]);
    setWeekdayPeriods(7);
    setSaturdayPeriods(4);
    setIncludeSaturday(false);
  };

  const getAvailableTeachers = (subject: string) => {
    return teachers.filter(teacher => teacher.subjects.includes(subject));
  };

  // Step 5: Generate Timetables with consecutive class logic
  const generateTimetables = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
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

      // Initialize timetables
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        state.timetables[className] = {};
        allDays.forEach(day => {
          const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
          state.timetables[className][day] = Array(periodsForDay).fill(null);
        });
      });

      // Initialize teacher schedules
      teachers.forEach(teacher => {
        state.teacherSchedules[teacher.id] = {};
        allDays.forEach(day => {
          const maxPeriodsForDay = day === 'Saturday' 
            ? Math.max(...classConfigs.filter(c => c.includeSaturday).map(c => c.saturdayPeriods))
            : Math.max(...classConfigs.map(c => c.weekdayPeriods));
          state.teacherSchedules[teacher.id][day] = Array(maxPeriodsForDay || (day === 'Saturday' ? 4 : 7)).fill(null);
        });
      });

      // Generate timetables with enhanced logic
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        const workingDays = config.includeSaturday ? allDays : days;
        
        // Sort assignments by priority (activity subjects first for better distribution)
        const sortedAssignments = [...config.subjectAssignments].sort((a, b) => {
          const aIsActivity = activitySubjects.includes(a.subject);
          const bIsActivity = activitySubjects.includes(b.subject);
          if (aIsActivity && !bIsActivity) return -1;
          if (!aIsActivity && bIsActivity) return 1;
          return 0;
        });

        sortedAssignments.forEach(assignment => {
          const teacher = teachers.find(t => t.id === assignment.teacherId);
          if (!teacher) return;

          let assignedPeriods = 0;
          const maxPeriods = assignment.periodsPerWeek;
          const isActivitySubject = activitySubjects.includes(assignment.subject);

          // Strategy 1: Distribute activity subjects across different days first
          if (isActivitySubject) {
            for (let dayIndex = 0; dayIndex < workingDays.length && assignedPeriods < maxPeriods; dayIndex++) {
              const day = workingDays[dayIndex];
              const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
              
              // Try to place one period per day for activity subjects
              const currentDayCount = state.subjectDayCount[className]?.[assignment.subject]?.[day] || 0;
              if (currentDayCount === 0) { // Only if not already placed on this day
                
                // Find suitable slots (prefer middle periods for activity subjects)
                const preferredSlots = [];
                const middleStart = Math.floor(periodsForDay / 3);
                const middleEnd = Math.floor((2 * periodsForDay) / 3);
                
                for (let period = middleStart; period < middleEnd; period++) {
                  preferredSlots.push(period);
                }
                
                // Add remaining slots
                for (let period = 0; period < periodsForDay; period++) {
                  if (!preferredSlots.includes(period)) {
                    preferredSlots.push(period);
                  }
                }

                for (const period of preferredSlots) {
                  if (canPlacePeriod(state, className, day, period, assignment.subject, teacher.id)) {
                    updateScheduleState(state, className, day, period, assignment.subject, teacher.id, teacher.name);
                    assignedPeriods++;
                    break;
                  }
                }
              }
            }
          }

          // Strategy 2: Fill remaining periods with improved distribution
          const attempts = [];
          
          // Create all possible placements
          for (let dayIndex = 0; dayIndex < workingDays.length; dayIndex++) {
            const day = workingDays[dayIndex];
            const periodsForDay = day === 'Saturday' ? config.saturdayPeriods : config.weekdayPeriods;
            
            for (let period = 0; period < periodsForDay; period++) {
              attempts.push({ day, period, dayIndex });
            }
          }

          // Shuffle attempts for better distribution
          for (let i = attempts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [attempts[i], attempts[j]] = [attempts[j], attempts[i]];
          }

          // Place remaining periods
          for (const attempt of attempts) {
            if (assignedPeriods >= maxPeriods) break;
            
            if (canPlacePeriod(state, className, attempt.day, attempt.period, assignment.subject, teacher.id)) {
              updateScheduleState(state, className, attempt.day, attempt.period, assignment.subject, teacher.id, teacher.name);
              assignedPeriods++;
            }
          }

          console.log(`${className} - ${assignment.subject}: Assigned ${assignedPeriods}/${maxPeriods} periods`);
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

      setGeneratedTimetables({ 
        timetables: state.timetables, 
        teacherSchedules: teacherTimetables,
        days: allDays 
      });
      setIsGenerating(false);
      setCurrentStep(5);
      
      toast({
        title: "Enhanced Timetables Generated! 🎉",
        description: `Successfully generated optimized timetables for classes and teachers with personal time.`,
      });
    }, 2000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Add Teachers</span>
                </CardTitle>
                <CardDescription>Add teachers with their subjects and contact information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTeacher} className="space-y-4">
                  <div>
                    <Label htmlFor="teacherName">Teacher Name</Label>
                    <Input
                      id="teacherName"
                      placeholder="Enter teacher name"
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Subjects (Select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableSubjects.map(subject => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${subject}`}
                            checked={newTeacherSubjects.includes(subject)}
                            onCheckedChange={() => toggleTeacherSubject(subject)}
                          />
                          <Label htmlFor={`subject-${subject}`} className="text-sm">{subject}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="contactInfo">Contact Info (Optional)</Label>
                    <Input
                      id="contactInfo"
                      placeholder="Phone number or email"
                      value={newTeacherContact}
                      onChange={(e) => setNewTeacherContact(e.target.value)}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Teacher
                  </Button>
                </form>
              </CardContent>
            </Card>

            {teachers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Added Teachers ({teachers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teachers.map(teacher => (
                      <div key={teacher.id} className="p-4 border rounded-lg">
                        {editingTeacher === teacher.id ? (
                          <div className="space-y-4">
                            <div>
                              <Label>Teacher Name</Label>
                              <Input
                                value={editTeacherName}
                                onChange={(e) => setEditTeacherName(e.target.value)}
                                placeholder="Enter teacher name"
                              />
                            </div>
                            
                            <div>
                              <Label>Subjects</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {availableSubjects.map(subject => (
                                  <div key={subject} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-subject-${subject}`}
                                      checked={editTeacherSubjects.includes(subject)}
                                      onCheckedChange={() => toggleEditTeacherSubject(subject)}
                                    />
                                    <Label htmlFor={`edit-subject-${subject}`} className="text-sm">{subject}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <Label>Contact Info</Label>
                              <Input
                                value={editTeacherContact}
                                onChange={(e) => setEditTeacherContact(e.target.value)}
                                placeholder="Phone number or email"
                              />
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={saveEditingTeacher}>
                                <Check className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditingTeacher}>
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{teacher.name}</div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditingTeacher(teacher)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Trash2 
                                  className="w-4 h-4 cursor-pointer hover:text-red-500" 
                                  onClick={() => removeTeacher(teacher.id)}
                                />
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              Subjects: {teacher.subjects.join(', ')}
                            </div>
                            {Object.keys(teacher.assignedPeriods).length > 0 && (
                              <div className="text-sm text-gray-600 mb-2">
                                Assigned Periods: {Object.entries(teacher.assignedPeriods).map(([subject, periods]) => 
                                  `${subject}: ${periods}`
                                ).join(', ')}
                              </div>
                            )}
                            {teacher.contactInfo && (
                              <div className="text-sm text-gray-500">
                                Contact: {teacher.contactInfo}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>Class & Division Selection</span>
                </CardTitle>
                <CardDescription>Select class, division, and configure periods per day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Class</Label>
                    <Select value={currentClass} onValueChange={setCurrentClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Division</Label>
                    <Select value={currentDivision} onValueChange={setCurrentDivision}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {divisions.map(div => (
                          <SelectItem key={div} value={div}>Division {div}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weekdayPeriods">
                        Periods per Day (Monday - Friday)
                      </Label>
                      <Select value={weekdayPeriods.toString()} onValueChange={(value) => setWeekdayPeriods(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select periods" />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 6, 7, 8, 9].map(num => (
                            <SelectItem key={num} value={num.toString()}>{num} periods</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="saturdayPeriods">
                        Periods on Saturday
                      </Label>
                      <Select value={saturdayPeriods.toString()} onValueChange={(value) => setSaturdayPeriods(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select periods" />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 4, 5, 6, 7].map(num => (
                            <SelectItem key={num} value={num.toString()}>{num} periods</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSaturday"
                      checked={includeSaturday}
                      onCheckedChange={(checked) => setIncludeSaturday(checked as boolean)}
                    />
                    <Label htmlFor="includeSaturday">Include Saturday</Label>
                  </div>

                  {/* Period Summary */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-900">Total Periods per Week</div>
                    <div className="text-sm text-blue-700 mt-1">
                      Monday-Friday: {weekdayPeriods} × 5 = {weekdayPeriods * 5} periods
                    </div>
                    {includeSaturday && (
                      <div className="text-sm text-blue-700">
                        Saturday: {saturdayPeriods} periods
                      </div>
                    )}
                    <div className="text-lg font-bold text-blue-900 mt-2">
                      Total: {calculateTotalPeriods()} periods/week
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartClassConfig}
                  disabled={!currentClass || !currentDivision}
                  className="w-full"
                >
                  Configure Subjects <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {classConfigs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Configured Classes ({classConfigs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classConfigs.map((config, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="font-medium">{config.class}{config.division}</div>
                        <div className="text-sm text-gray-600">
                          {config.selectedSubjects.length} subjects, {config.periodsPerWeek} periods/week
                          {config.includeSaturday ? ' (incl. Saturday)' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          Weekdays: {config.weekdayPeriods}/day, Saturday: {config.saturdayPeriods}/day
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        const totalAssigned = getTotalAssignedPeriods();
        const maxPeriods = currentConfig?.periodsPerWeek || 42;
        const remainingPeriods = maxPeriods - totalAssigned;

        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Configure {currentConfig?.class}{currentConfig?.division}
                </CardTitle>
                <CardDescription>
                  Select subjects and assign teachers. Total periods: {currentConfig?.periodsPerWeek}
                  {currentConfig?.includeSaturday ? ' (including Saturday)' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Summary */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">Period Summary</div>
                      <div className="text-sm text-blue-700">
                        Assigned: {totalAssigned} / {maxPeriods} periods
                      </div>
                    </div>
                    <div className={`font-bold ${remainingPeriods < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remainingPeriods < 0 ? 'Exceeds by' : 'Remaining'}: {Math.abs(remainingPeriods)}
                    </div>
                  </div>
                  {remainingPeriods < 0 && (
                    <div className="flex items-center space-x-2 mt-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Total periods exceed the maximum allowed</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-base font-medium">Select Subjects</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableSubjects.map(subject => (
                      <div key={subject} className="flex items-center space-x-2">
                        <Checkbox
                          id={`config-subject-${subject}`}
                          checked={selectedSubjects.includes(subject)}
                          onCheckedChange={() => toggleSubject(subject)}
                        />
                        <Label htmlFor={`config-subject-${subject}`} className="text-sm">{subject}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedSubjects.length > 0 && (
                  <div>
                    <Label className="text-base font-medium">Assign Teachers & Periods</Label>
                    <div className="space-y-4 mt-4">
                      {selectedSubjects.map(subject => {
                        const availableTeachers = getAvailableTeachers(subject);
                        const currentAssignment = currentConfig?.subjectAssignments.find(a => a.subject === subject);
                        
                        return (
                          <div key={subject} className="p-4 border rounded-lg">
                            <div className="font-medium mb-3">{subject}</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Periods per week</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={maxPeriods}
                                  defaultValue={currentAssignment?.periodsPerWeek || 5}
                                  onChange={(e) => {
                                    const periods = parseInt(e.target.value) || 5;
                                    const teacherId = currentAssignment?.teacherId || '';
                                    if (teacherId) {
                                      handleSubjectAssignment(subject, periods, teacherId);
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label>Assign Teacher</Label>
                                <Select
                                  value={currentAssignment?.teacherId || ''}
                                  onValueChange={(teacherId) => {
                                    const periods = currentAssignment?.periodsPerWeek || 5;
                                    handleSubjectAssignment(subject, periods, teacherId);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select teacher" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTeachers.map(teacher => {
                                      const assignedForSubject = teacher.assignedPeriods[subject] || 0;
                                      return (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                          {teacher.name} ({subject}: {assignedForSubject} periods)
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                {availableTeachers.length === 0 && (
                                  <p className="text-sm text-red-500 mt-1">
                                    No available teachers for {subject}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={saveClassConfig}
                    disabled={selectedSubjects.length === 0 || !selectedSubjects.every(subject => 
                      currentConfig?.subjectAssignments.some(a => a.subject === subject && a.teacherId)
                    ) || exceedsMaxPeriods()}
                    className="flex-1"
                  >
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {generatedTimetables && (
              <TimetableDisplay 
                timetables={generatedTimetables.timetables}
                teacherSchedules={generatedTimetables.teacherSchedules}
                teachers={teachers}
                periodsPerDay={7}
                days={generatedTimetables.days}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Step 1: Add Teachers';
      case 2: return 'Step 2: Select Class & Division';
      case 4: return 'Step 3: Configure Subjects';
      case 5: return 'Step 4: Generated Timetables';
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Automatic Timetable Generator
        </h2>
        <p className="text-lg text-gray-600">
          Follow the step-by-step process to create optimized timetables
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          {[1, 2, 4, 5].map((step, index) => (
            <React.Fragment key={step}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step === 5 ? '4' : step === 4 ? '3' : step}
              </div>
              {index < 3 && (
                <div className={`w-12 h-1 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{getStepTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && currentStep !== 4 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Step
            </Button>
          )}
        </div>
        
        <div>
          {currentStep === 1 && teachers.length > 0 && (
            <Button onClick={() => setCurrentStep(2)}>
              Next: Select Classes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 2 && classConfigs.length > 0 && (
            <Button onClick={generateTimetables} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Timetables
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimetableGenerator;
