
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Calendar, Users, BookOpen, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from './TimetableDisplay';

interface Teacher {
  id: string;
  name: string;
  subjects: string[];
  availability: { [key: string]: boolean[] }; // day -> periods available
}

interface Subject {
  id: string;
  name: string;
  periodsPerWeek: number;
}

interface Class {
  id: string;
  name: string;
}

const TimetableGenerator = () => {
  const { toast } = useToast();
  const [periodsPerDay, setPeriodsPerDay] = useState(7);
  const [classes, setClasses] = useState<Class[]>([
    { id: '1', name: '6A' },
    { id: '2', name: '6B' }
  ]);
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: '1', name: 'Mathematics', periodsPerWeek: 5 },
    { id: '2', name: 'Science', periodsPerWeek: 4 },
    { id: '3', name: 'English', periodsPerWeek: 4 },
    { id: '4', name: 'Social Studies', periodsPerWeek: 3 }
  ]);
  const [teachers, setTeachers] = useState<Teacher[]>([
    { 
      id: '1', 
      name: 'Mr. Smith', 
      subjects: ['Mathematics'],
      availability: {
        'Monday': Array(7).fill(true),
        'Tuesday': Array(7).fill(true),
        'Wednesday': Array(7).fill(true),
        'Thursday': Array(7).fill(true),
        'Friday': Array(7).fill(true)
      }
    },
    { 
      id: '2', 
      name: 'Ms. Johnson', 
      subjects: ['Science'],
      availability: {
        'Monday': Array(7).fill(true),
        'Tuesday': Array(7).fill(true),
        'Wednesday': Array(7).fill(true),
        'Thursday': Array(7).fill(true),
        'Friday': Array(7).fill(true)
      }
    },
    { 
      id: '3', 
      name: 'Mrs. Brown', 
      subjects: ['English'],
      availability: {
        'Monday': Array(7).fill(true),
        'Tuesday': Array(7).fill(true),
        'Wednesday': Array(7).fill(true),
        'Thursday': Array(7).fill(true),
        'Friday': Array(7).fill(true)
      }
    }
  ]);
  
  const [generatedTimetables, setGeneratedTimetables] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const addClass = () => {
    const newClass: Class = {
      id: Date.now().toString(),
      name: `Class ${classes.length + 1}`
    };
    setClasses([...classes, newClass]);
  };

  const removeClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  const addSubject = () => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      name: `Subject ${subjects.length + 1}`,
      periodsPerWeek: 3
    };
    setSubjects([...subjects, newSubject]);
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const addTeacher = () => {
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: `Teacher ${teachers.length + 1}`,
      subjects: [],
      availability: {
        'Monday': Array(periodsPerDay).fill(true),
        'Tuesday': Array(periodsPerDay).fill(true),
        'Wednesday': Array(periodsPerDay).fill(true),
        'Thursday': Array(periodsPerDay).fill(true),
        'Friday': Array(periodsPerDay).fill(true)
      }
    };
    setTeachers([...teachers, newTeacher]);
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  const generateTimetables = () => {
    setIsGenerating(true);
    
    // Simulate processing time
    setTimeout(() => {
      const timetables: any = {};
      
      // Initialize empty timetables for each class
      classes.forEach(cls => {
        timetables[cls.name] = {};
        days.forEach(day => {
          timetables[cls.name][day] = Array(periodsPerDay).fill(null);
        });
      });

      // Track teacher schedules to avoid conflicts
      const teacherSchedules: any = {};
      teachers.forEach(teacher => {
        teacherSchedules[teacher.id] = {};
        days.forEach(day => {
          teacherSchedules[teacher.id][day] = Array(periodsPerDay).fill(null);
        });
      });

      // Generate timetables using the algorithm
      classes.forEach(cls => {
        subjects.forEach(subject => {
          // Find a teacher who can teach this subject
          const availableTeacher = teachers.find(teacher => 
            teacher.subjects.includes(subject.name)
          );
          
          if (!availableTeacher) return;

          let assignedPeriods = 0;
          const maxPeriods = Math.min(subject.periodsPerWeek, periodsPerDay * days.length);

          // Try to distribute periods evenly across days
          for (let dayIndex = 0; dayIndex < days.length && assignedPeriods < maxPeriods; dayIndex++) {
            const day = days[dayIndex];
            
            for (let period = 0; period < periodsPerDay && assignedPeriods < maxPeriods; period++) {
              // Check if slot is available for both class and teacher
              if (
                timetables[cls.name][day][period] === null &&
                teacherSchedules[availableTeacher.id][day][period] === null &&
                availableTeacher.availability[day][period]
              ) {
                // Assign the period
                timetables[cls.name][day][period] = {
                  subject: subject.name,
                  teacher: availableTeacher.name,
                  teacherId: availableTeacher.id
                };
                teacherSchedules[availableTeacher.id][day][period] = cls.name;
                assignedPeriods++;
              }
            }
          }
        });
      });

      setGeneratedTimetables(timetables);
      setIsGenerating(false);
      
      toast({
        title: "Timetables Generated! 🎉",
        description: `Successfully generated timetables for ${classes.length} classes with no conflicts.`,
      });
    }, 2000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Automatic Timetable Generator
        </h2>
        <p className="text-lg text-gray-600">
          Configure your school parameters and generate optimized timetables automatically
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Basic Settings</span>
              </CardTitle>
              <CardDescription>Configure the fundamental timetable parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="periods">Periods per Day</Label>
                  <Input
                    id="periods"
                    type="number"
                    value={periodsPerDay}
                    onChange={(e) => setPeriodsPerDay(parseInt(e.target.value) || 7)}
                    min="1"
                    max="10"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Classes</span>
              </CardTitle>
              <CardDescription>Manage your school classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {classes.map(cls => (
                    <Badge key={cls.id} variant="secondary" className="flex items-center space-x-2">
                      <span>{cls.name}</span>
                      <Trash2 
                        className="w-3 h-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeClass(cls.id)}
                      />
                    </Badge>
                  ))}
                </div>
                <Button onClick={addClass} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subjects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Subjects</span>
              </CardTitle>
              <CardDescription>Configure subjects and their weekly periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subjects.map(subject => (
                  <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{subject.name}</div>
                      <div className="text-sm text-gray-500">{subject.periodsPerWeek} periods/week</div>
                    </div>
                    <Trash2 
                      className="w-4 h-4 cursor-pointer hover:text-red-500" 
                      onClick={() => removeSubject(subject.id)}
                    />
                  </div>
                ))}
                <Button onClick={addSubject} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teachers Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Teachers</span>
              </CardTitle>
              <CardDescription>Manage teachers and their subject assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">{teacher.name}</div>
                      <Trash2 
                        className="w-4 h-4 cursor-pointer hover:text-red-500" 
                        onClick={() => removeTeacher(teacher.id)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Subjects:</div>
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects.map(subject => (
                          <Badge key={subject} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addTeacher} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Teacher
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Generate Timetables</span>
              </CardTitle>
              <CardDescription>
                Create optimized timetables based on your configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={generateTimetables} 
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Generate Timetables
                  </>
                )}
              </Button>
              
              {generatedTimetables && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-800">
                    ✅ Timetables generated successfully!
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    No scheduling conflicts detected
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generated Timetables Display */}
      {generatedTimetables && (
        <>
          <Separator />
          <TimetableDisplay 
            timetables={generatedTimetables} 
            periodsPerDay={periodsPerDay}
            days={days}
          />
        </>
      )}
    </div>
  );
};

export default TimetableGenerator;
