import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Users, X, BookOpen, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/types/timetable';

interface TeacherFormProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
}

const defaultMainSubjects = ['English', 'Maths', 'Science', 'SST', 'Hindi', 'Gujarati', 'Sanskrit'];
const defaultExtraSubjects = ['PE', 'Computer', 'Drawing', 'Music', 'Dance'];
const availableClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const TeacherForm = ({ teachers, onAddTeacher }: TeacherFormProps) => {
  const { toast } = useToast();
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherMainSubjects, setNewTeacherMainSubjects] = useState<string[]>([]);
  const [newTeacherExtraSubjects, setNewTeacherExtraSubjects] = useState<string[]>([]);
  const [newTeacherContact, setNewTeacherContact] = useState('');
  const [newTeacherPeriodLimit, setNewTeacherPeriodLimit] = useState<number>(35);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherOf, setClassTeacherOf] = useState('');
  
  // Custom subjects management
  const [customMainSubjects, setCustomMainSubjects] = useState<string[]>([]);
  const [customExtraSubjects, setCustomExtraSubjects] = useState<string[]>([]);
  const [newCustomMainSubject, setNewCustomMainSubject] = useState('');
  const [newCustomExtraSubject, setNewCustomExtraSubject] = useState('');

  // Combine default and custom subjects
  const availableMainSubjects = [...defaultMainSubjects, ...customMainSubjects];
  const availableExtraSubjects = [...defaultExtraSubjects, ...customExtraSubjects];

  const handleAddCustomMainSubject = () => {
    const trimmedSubject = newCustomMainSubject.trim();
    if (trimmedSubject && !availableMainSubjects.includes(trimmedSubject)) {
      setCustomMainSubjects(prev => [...prev, trimmedSubject]);
      setNewCustomMainSubject('');
      toast({
        title: "Main Subject Added",
        description: `${trimmedSubject} has been added to main subjects.`,
      });
    } else if (availableMainSubjects.includes(trimmedSubject)) {
      toast({
        title: "Subject Already Exists",
        description: `${trimmedSubject} is already in the main subjects list.`,
        variant: "destructive"
      });
    }
  };

  const handleAddCustomExtraSubject = () => {
    const trimmedSubject = newCustomExtraSubject.trim();
    if (trimmedSubject && !availableExtraSubjects.includes(trimmedSubject)) {
      setCustomExtraSubjects(prev => [...prev, trimmedSubject]);
      setNewCustomExtraSubject('');
      toast({
        title: "Extra Subject Added",
        description: `${trimmedSubject} has been added to extra subjects.`,
      });
    } else if (availableExtraSubjects.includes(trimmedSubject)) {
      toast({
        title: "Subject Already Exists",
        description: `${trimmedSubject} is already in the extra subjects list.`,
        variant: "destructive"
      });
    }
  };

  const handleRemoveCustomMainSubject = (subject: string) => {
    setCustomMainSubjects(prev => prev.filter(s => s !== subject));
    setNewTeacherMainSubjects(prev => prev.filter(s => s !== subject));
  };

  const handleRemoveCustomExtraSubject = (subject: string) => {
    setCustomExtraSubjects(prev => prev.filter(s => s !== subject));
    setNewTeacherExtraSubjects(prev => prev.filter(s => s !== subject));
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherName.trim() && (newTeacherMainSubjects.length > 0 || newTeacherExtraSubjects.length > 0)) {
      // Check if class is already assigned to another teacher
      if (isClassTeacher && classTeacherOf) {
        const existingClassTeacher = teachers.find(t => t.isClassTeacher && t.classTeacherOf === classTeacherOf);
        if (existingClassTeacher) {
          toast({
            title: "Class Already Assigned",
            description: `Class ${classTeacherOf} is already assigned to ${existingClassTeacher.name}.`,
            variant: "destructive"
          });
          return;
        }
      }

      const allSubjects = [...newTeacherMainSubjects, ...newTeacherExtraSubjects];
      
      const newTeacher: Teacher = {
        id: Date.now().toString(),
        name: newTeacherName.trim(),
        subjects: allSubjects, // Keep for backward compatibility
        mainSubjects: [...newTeacherMainSubjects],
        extraSubjects: [...newTeacherExtraSubjects],
        contactInfo: newTeacherContact.trim() || undefined,
        assignedPeriods: {},
        periodLimit: newTeacherPeriodLimit,
        isClassTeacher: isClassTeacher,
        classTeacherOf: isClassTeacher ? classTeacherOf : undefined
      };
      onAddTeacher(newTeacher);
      
      // Reset form
      setNewTeacherName('');
      setNewTeacherMainSubjects([]);
      setNewTeacherExtraSubjects([]);
      setNewTeacherContact('');
      setNewTeacherPeriodLimit(35);
      setIsClassTeacher(false);
      setClassTeacherOf('');
      
      toast({
        title: "Teacher Added",
        description: `${newTeacher.name} has been added successfully.`,
      });
    } else {
      toast({
        title: "Missing Information",
        description: "Please enter teacher name and select at least one subject.",
        variant: "destructive"
      });
    }
  };

  const toggleMainSubject = (subject: string) => {
    setNewTeacherMainSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const toggleExtraSubject = (subject: string) => {
    setNewTeacherExtraSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Add Teachers</span>
        </CardTitle>
        <CardDescription>Add teachers with their main and extra subjects, period limits, and class teacher assignments</CardDescription>
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
          
          {/* Main Subjects Section */}
          <div>
            <Label className="flex items-center space-x-2 text-base font-medium">
              <BookOpen className="w-4 h-4" />
              <span>Main Subjects</span>
            </Label>
            
            {/* Add Custom Main Subject */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Add Custom Main Subject</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter main subject name"
                  value={newCustomMainSubject}
                  onChange={(e) => setNewCustomMainSubject(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomMainSubject())}
                />
                <Button 
                  type="button" 
                  onClick={handleAddCustomMainSubject}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              {availableMainSubjects.map(subject => {
                const isCustom = customMainSubjects.includes(subject);
                return (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={`main-subject-${subject}`}
                      checked={newTeacherMainSubjects.includes(subject)}
                      onCheckedChange={() => toggleMainSubject(subject)}
                    />
                    <Label htmlFor={`main-subject-${subject}`} className="text-sm flex-1">{subject}</Label>
                    {isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomMainSubject(subject)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extra Subjects Section */}
          <div>
            <Label className="flex items-center space-x-2 text-base font-medium">
              <Palette className="w-4 h-4" />
              <span>Extra Subjects</span>
            </Label>
            
            {/* Add Custom Extra Subject */}
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Add Custom Extra Subject</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter extra subject name"
                  value={newCustomExtraSubject}
                  onChange={(e) => setNewCustomExtraSubject(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomExtraSubject())}
                />
                <Button 
                  type="button" 
                  onClick={handleAddCustomExtraSubject}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              {availableExtraSubjects.map(subject => {
                const isCustom = customExtraSubjects.includes(subject);
                return (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={`extra-subject-${subject}`}
                      checked={newTeacherExtraSubjects.includes(subject)}
                      onCheckedChange={() => toggleExtraSubject(subject)}
                    />
                    <Label htmlFor={`extra-subject-${subject}`} className="text-sm flex-1">{subject}</Label>
                    {isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomExtraSubject(subject)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="periodLimit">Period Limit per Week</Label>
            <Input
              id="periodLimit"
              type="number"
              min="1"
              max="50"
              placeholder="Enter maximum periods per week"
              value={newTeacherPeriodLimit}
              onChange={(e) => setNewTeacherPeriodLimit(Number(e.target.value))}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum periods this teacher can be assigned per week
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isClassTeacher"
                checked={isClassTeacher}
                onCheckedChange={(checked) => {
                  setIsClassTeacher(checked as boolean);
                  if (!checked) setClassTeacherOf('');
                }}
              />
              <Label htmlFor="isClassTeacher">Assign as Class Teacher</Label>
            </div>

            {isClassTeacher && (
              <div>
                <Label htmlFor="classTeacherOf">Class Teacher of</Label>
                <select
                  id="classTeacherOf"
                  value={classTeacherOf}
                  onChange={(e) => setClassTeacherOf(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={isClassTeacher}
                >
                  <option value="">Select Class</option>
                  {availableClasses.map(cls => {
                    const isAssigned = teachers.some(t => t.isClassTeacher && t.classTeacherOf === cls);
                    return (
                      <option key={cls} value={cls} disabled={isAssigned}>
                        Class {cls} {isAssigned ? '(Already Assigned)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
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
  );
};

export default TeacherForm;
