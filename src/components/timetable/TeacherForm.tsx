
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/types/timetable';

interface TeacherFormProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
}

const defaultSubjects = ['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE', 'Science', 'Drawing', 'Sanskrit'];
const availableClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const TeacherForm = ({ teachers, onAddTeacher }: TeacherFormProps) => {
  const { toast } = useToast();
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<string[]>([]);
  const [newTeacherContact, setNewTeacherContact] = useState('');
  const [newTeacherPeriodLimit, setNewTeacherPeriodLimit] = useState<number>(35);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherOf, setClassTeacherOf] = useState('');
  
  // Custom subjects management
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [newCustomSubject, setNewCustomSubject] = useState('');

  // Combine default and custom subjects
  const availableSubjects = [...defaultSubjects, ...customSubjects];

  const handleAddCustomSubject = () => {
    const trimmedSubject = newCustomSubject.trim();
    if (trimmedSubject && !availableSubjects.includes(trimmedSubject)) {
      setCustomSubjects(prev => [...prev, trimmedSubject]);
      setNewCustomSubject('');
      toast({
        title: "Subject Added",
        description: `${trimmedSubject} has been added to available subjects.`,
      });
    } else if (availableSubjects.includes(trimmedSubject)) {
      toast({
        title: "Subject Already Exists",
        description: `${trimmedSubject} is already in the subjects list.`,
        variant: "destructive"
      });
    }
  };

  const handleRemoveCustomSubject = (subject: string) => {
    setCustomSubjects(prev => prev.filter(s => s !== subject));
    setNewTeacherSubjects(prev => prev.filter(s => s !== subject));
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherName.trim() && newTeacherSubjects.length > 0) {
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

      const newTeacher: Teacher = {
        id: Date.now().toString(),
        name: newTeacherName.trim(),
        subjects: [...newTeacherSubjects],
        contactInfo: newTeacherContact.trim() || undefined,
        assignedPeriods: {},
        periodLimit: newTeacherPeriodLimit,
        isClassTeacher: isClassTeacher,
        classTeacherOf: isClassTeacher ? classTeacherOf : undefined
      };
      onAddTeacher(newTeacher);
      
      // Reset form
      setNewTeacherName('');
      setNewTeacherSubjects([]);
      setNewTeacherContact('');
      setNewTeacherPeriodLimit(35);
      setIsClassTeacher(false);
      setClassTeacherOf('');
      
      toast({
        title: "Teacher Added",
        description: `${newTeacher.name} has been added successfully.`,
      });
    }
  };

  const toggleTeacherSubject = (subject: string) => {
    setNewTeacherSubjects(prev => 
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
        <CardDescription>Add teachers with their subjects, period limits, and class teacher assignments</CardDescription>
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
            
            {/* Add Custom Subject Section */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Add Custom Subject</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter subject name"
                  value={newCustomSubject}
                  onChange={(e) => setNewCustomSubject(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSubject())}
                />
                <Button 
                  type="button" 
                  onClick={handleAddCustomSubject}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              {availableSubjects.map(subject => {
                const isCustom = customSubjects.includes(subject);
                return (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject}`}
                      checked={newTeacherSubjects.includes(subject)}
                      onCheckedChange={() => toggleTeacherSubject(subject)}
                    />
                    <Label htmlFor={`subject-${subject}`} className="text-sm flex-1">{subject}</Label>
                    {isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomSubject(subject)}
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
