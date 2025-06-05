
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { ClassConfig, Teacher } from '@/types/timetable';

interface SubjectAssignmentFormProps {
  currentConfig: ClassConfig | null;
  selectedSubjects: string[];
  teachers: Teacher[];
  onToggleSubject: (subject: string) => void;
  onSubjectAssignment: (subject: string, periodsPerWeek: number, teacherId: string) => void;
  onSaveConfig: () => void;
  onBack: () => void;
}

const availableSubjects = ['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE'];

const SubjectAssignmentForm = ({
  currentConfig,
  selectedSubjects,
  teachers,
  onToggleSubject,
  onSubjectAssignment,
  onSaveConfig,
  onBack
}: SubjectAssignmentFormProps) => {
  if (!currentConfig) return null;

  const getTotalAssignedPeriods = () => {
    return currentConfig.subjectAssignments.reduce((total, assignment) => total + assignment.periodsPerWeek, 0);
  };

  const getAvailableTeachers = (subject: string) => {
    return teachers.filter(teacher => teacher.subjects.includes(subject));
  };

  const exceedsMaxPeriods = () => {
    const totalAssigned = getTotalAssignedPeriods();
    return totalAssigned > currentConfig.periodsPerWeek;
  };

  const totalAssigned = getTotalAssignedPeriods();
  const maxPeriods = currentConfig.periodsPerWeek;
  const remainingPeriods = maxPeriods - totalAssigned;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Configure {currentConfig.class}{currentConfig.division}
          </CardTitle>
          <CardDescription>
            Select subjects and assign teachers. Total periods: {currentConfig.periodsPerWeek}
            {currentConfig.includeSaturday ? ' (including Saturday)' : ''}
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
                    onCheckedChange={() => onToggleSubject(subject)}
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
                  const currentAssignment = currentConfig.subjectAssignments.find(a => a.subject === subject);
                  
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
                                onSubjectAssignment(subject, periods, teacherId);
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
                              onSubjectAssignment(subject, periods, teacherId);
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
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={onSaveConfig}
              disabled={selectedSubjects.length === 0 || !selectedSubjects.every(subject => 
                currentConfig.subjectAssignments.some(a => a.subject === subject && a.teacherId)
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
};

export default SubjectAssignmentForm;
