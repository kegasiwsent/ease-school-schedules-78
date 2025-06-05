
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
const availableClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const TeacherList = ({ teachers, onUpdateTeacher, onRemoveTeacher }: TeacherListProps) => {
  const { toast } = useToast();
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherSubjects, setEditTeacherSubjects] = useState<string[]>([]);
  const [editTeacherContact, setEditTeacherContact] = useState('');
  const [editTeacherPeriodLimit, setEditTeacherPeriodLimit] = useState<number>(35);
  const [editIsClassTeacher, setEditIsClassTeacher] = useState(false);
  const [editClassTeacherOf, setEditClassTeacherOf] = useState('');

  const startEditingTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher.id);
    setEditTeacherName(teacher.name);
    setEditTeacherSubjects([...teacher.subjects]);
    setEditTeacherContact(teacher.contactInfo || '');
    setEditTeacherPeriodLimit(teacher.periodLimit || 35);
    setEditIsClassTeacher(teacher.isClassTeacher || false);
    setEditClassTeacherOf(teacher.classTeacherOf || '');
  };

  const cancelEditingTeacher = () => {
    setEditingTeacher(null);
    setEditTeacherName('');
    setEditTeacherSubjects([]);
    setEditTeacherContact('');
    setEditTeacherPeriodLimit(35);
    setEditIsClassTeacher(false);
    setEditClassTeacherOf('');
  };

  const saveEditingTeacher = () => {
    if (!editingTeacher || !editTeacherName.trim() || editTeacherSubjects.length === 0) return;

    // Check if class is already assigned to another teacher (excluding current teacher)
    if (editIsClassTeacher && editClassTeacherOf) {
      const existingClassTeacher = teachers.find(t => 
        t.id !== editingTeacher && t.isClassTeacher && t.classTeacherOf === editClassTeacherOf
      );
      if (existingClassTeacher) {
        toast({
          title: "Class Already Assigned",
          description: `Class ${editClassTeacherOf} is already assigned to ${existingClassTeacher.name}.`,
          variant: "destructive"
        });
        return;
      }
    }

    onUpdateTeacher(editingTeacher, {
      name: editTeacherName.trim(),
      subjects: [...editTeacherSubjects],
      contactInfo: editTeacherContact.trim() || undefined,
      periodLimit: editTeacherPeriodLimit,
      isClassTeacher: editIsClassTeacher,
      classTeacherOf: editIsClassTeacher ? editClassTeacherOf : undefined
    });

    cancelEditingTeacher();

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

  const getTotalAssignedPeriods = (teacher: Teacher) => {
    return Object.values(teacher.assignedPeriods).reduce((total, periods) => total + periods, 0);
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
          {teachers.map(teacher => {
            const totalAssigned = getTotalAssignedPeriods(teacher);
            const periodLimit = teacher.periodLimit || 35;
            const isOverLimit = totalAssigned > periodLimit;
            
            return (
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
                      <Label>Period Limit per Week</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={editTeacherPeriodLimit}
                        onChange={(e) => setEditTeacherPeriodLimit(Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-isClassTeacher-${teacher.id}`}
                          checked={editIsClassTeacher}
                          onCheckedChange={(checked) => {
                            setEditIsClassTeacher(checked as boolean);
                            if (!checked) setEditClassTeacherOf('');
                          }}
                        />
                        <Label htmlFor={`edit-isClassTeacher-${teacher.id}`}>Assign as Class Teacher</Label>
                      </div>

                      {editIsClassTeacher && (
                        <div>
                          <Label>Class Teacher of</Label>
                          <select
                            value={editClassTeacherOf}
                            onChange={(e) => setEditClassTeacherOf(e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required={editIsClassTeacher}
                          >
                            <option value="">Select Class</option>
                            {availableClasses.map(cls => {
                              const isAssigned = teachers.some(t => 
                                t.id !== editingTeacher && t.isClassTeacher && t.classTeacherOf === cls
                              );
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
                      <div className="font-medium">
                        {teacher.name}
                        {teacher.isClassTeacher && teacher.classTeacherOf && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Class Teacher - {teacher.classTeacherOf}
                          </span>
                        )}
                      </div>
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
                    <div className="text-sm text-gray-600 mb-2">
                      Period Limit: 
                      <span className={`ml-1 font-medium ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                        {totalAssigned}/{periodLimit} periods
                      </span>
                      {isOverLimit && (
                        <span className="ml-2 text-red-600 text-xs">(Over Limit!)</span>
                      )}
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherList;
