
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/types/timetable';

interface TeacherFormProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
}

const availableSubjects = ['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE'];

const TeacherForm = ({ teachers, onAddTeacher }: TeacherFormProps) => {
  const { toast } = useToast();
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<string[]>([]);
  const [newTeacherContact, setNewTeacherContact] = useState('');

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
      onAddTeacher(newTeacher);
      setNewTeacherName('');
      setNewTeacherSubjects([]);
      setNewTeacherContact('');
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
  );
};

export default TeacherForm;
