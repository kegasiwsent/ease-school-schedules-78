import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Users, BookOpen, Clock, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from './TimetableDisplay';

interface Teacher {
  id: string;
  name: string;
  subjects: string[];
  contactInfo?: string;
  assignedPeriods: number; // Current periods assigned
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
}

const TimetableGenerator = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<string[]>([]);
  const [newTeacherContact, setNewTeacherContact] = useState('');
  
  // Step 2 & 3: Class Configuration
  const [classConfigs, setClassConfigs] = useState<ClassConfig[]>([]);
  const [currentClass, setCurrentClass] = useState('');
  const [currentDivision, setCurrentDivision] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // Step 4: Subject Assignments
  const [currentConfig, setCurrentConfig] = useState<ClassConfig | null>(null);
  
  // Step 5: Generated Timetables
  const [generatedTimetables, setGeneratedTimetables] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableSubjects = ['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE'];
  const classes = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const divisions = ['A', 'B', 'C', 'D'];

  // Helper function to calculate max periods for a teacher
  const getMaxPeriodsForTeacher = (teacher: Teacher) => {
    return teacher.subjects.length * 42;
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
        assignedPeriods: 0
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

  // Step 2-3: Class Configuration
  const handleStartClassConfig = () => {
    if (currentClass && currentDivision) {
      const existingConfig = classConfigs.find(
        config => config.class === currentClass && config.division === currentDivision
      );
      
      if (existingConfig) {
        setCurrentConfig(existingConfig);
        setSelectedSubjects(existingConfig.selectedSubjects);
      } else {
        const newConfig: ClassConfig = {
          class: currentClass,
          division: currentDivision,
          selectedSubjects: [],
          subjectAssignments: []
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

    const updatedConfigs = classConfigs.filter(
      config => !(config.class === currentConfig.class && config.division === currentConfig.division)
    );
    updatedConfigs.push(currentConfig);
    setClassConfigs(updatedConfigs);
    
    // Update teacher assigned periods
    const updatedTeachers = teachers.map(teacher => {
      const totalPeriods = updatedConfigs.reduce((total, config) => {
        return total + config.subjectAssignments
          .filter(assignment => assignment.teacherId === teacher.id)
          .reduce((sum, assignment) => sum + assignment.periodsPerWeek, 0);
      }, 0);
      return { ...teacher, assignedPeriods: totalPeriods };
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
  };

  const getAvailableTeachers = (subject: string) => {
    return teachers.filter(teacher => 
      teacher.subjects.includes(subject) && teacher.assignedPeriods < getMaxPeriodsForTeacher(teacher)
    );
  };

  // Step 5: Generate Timetables
  const generateTimetables = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const timetables: any = {};
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const periodsPerDay = 7;

      // Initialize timetables
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        timetables[className] = {};
        days.forEach(day => {
          timetables[className][day] = Array(periodsPerDay).fill(null);
        });
      });

      // Track teacher schedules
      const teacherSchedules: any = {};
      teachers.forEach(teacher => {
        teacherSchedules[teacher.id] = {};
        days.forEach(day => {
          teacherSchedules[teacher.id][day] = Array(periodsPerDay).fill(null);
        });
      });

      // Generate timetables using greedy algorithm
      classConfigs.forEach(config => {
        const className = `${config.class}${config.division}`;
        
        config.subjectAssignments.forEach(assignment => {
          const teacher = teachers.find(t => t.id === assignment.teacherId);
          if (!teacher) return;

          let assignedPeriods = 0;
          const maxPeriods = assignment.periodsPerWeek;

          // Distribute periods across the week
          for (let dayIndex = 0; dayIndex < days.length && assignedPeriods < maxPeriods; dayIndex++) {
            const day = days[dayIndex];
            
            for (let period = 0; period < periodsPerDay && assignedPeriods < maxPeriods; period++) {
              // Check if slot is available
              if (
                timetables[className][day][period] === null &&
                teacherSchedules[teacher.id][day][period] === null
              ) {
                // Assign the period
                timetables[className][day][period] = {
                  subject: assignment.subject,
                  teacher: teacher.name,
                  teacherId: teacher.id
                };
                teacherSchedules[teacher.id][day][period] = className;
                assignedPeriods++;
              }
            }
          }
        });
      });

      setGeneratedTimetables(timetables);
      setIsGenerating(false);
      setCurrentStep(5);
      
      toast({
        title: "Timetables Generated! 🎉",
        description: `Successfully generated timetables for ${classConfigs.length} classes.`,
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
                    {teachers.map(teacher => {
                      const maxPeriods = getMaxPeriodsForTeacher(teacher);
                      return (
                        <div key={teacher.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{teacher.name}</div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={teacher.assignedPeriods >= maxPeriods ? "destructive" : "secondary"}>
                                {teacher.assignedPeriods}/{maxPeriods} periods
                              </Badge>
                              <Trash2 
                                className="w-4 h-4 cursor-pointer hover:text-red-500" 
                                onClick={() => removeTeacher(teacher.id)}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            Subjects: {teacher.subjects.join(', ')} ({teacher.subjects.length} × 42 periods)
                          </div>
                          {teacher.contactInfo && (
                            <div className="text-sm text-gray-500">
                              Contact: {teacher.contactInfo}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                <CardDescription>Select class and division to configure subjects</CardDescription>
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
                          {config.selectedSubjects.length} subjects configured
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
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Configure {currentConfig?.class}{currentConfig?.division}
                </CardTitle>
                <CardDescription>Select subjects and assign teachers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                                  max="10"
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
                                      const maxPeriods = getMaxPeriodsForTeacher(teacher);
                                      return (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                          {teacher.name} ({teacher.assignedPeriods}/{maxPeriods})
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
                    )}
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
                timetables={generatedTimetables} 
                periodsPerDay={7}
                days={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ... keep existing code (getStepTitle function and return statement)
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
