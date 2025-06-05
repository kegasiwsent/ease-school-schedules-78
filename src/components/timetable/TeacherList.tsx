
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Edit, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/types/timetable';

interface TeacherListProps {
  teachers: Teacher[];
  onUpdateTeacher: (id: string, updatedTeacher: Partial<Teacher>) => void;
  onRemoveTeacher: (id: string) => void;
}

const availableSubjects = ['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE'];

const TeacherList = ({ teachers, onUpdateTeacher, onRemoveTeacher }: TeacherListProps) => {
  const { toast } = useToast();
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherSubjects, setEditTeacherSubjects] = useState<string[]>([]);
  const [editTeacherContact, setEditTeacherContact] = useState('');

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

    onUpdateTeacher(editingTeacher, {
      name: editTeacherName.trim(),
      subjects: [...editTeacherSubjects],
      contactInfo: editTeacherContact.trim() || undefined
    });

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

  if (teachers.length === 0) {
    return null;
  }

  return (
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
                        onClick={() => onRemoveTeacher(teacher.id)}
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
  );
};

export default TeacherList;
