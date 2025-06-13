
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertCircle, User, Crown, AlertTriangle } from 'lucide-react';
import { getAllAvailableSubjects } from '@/utils/subjectUtils';
import type { ClassConfig, Teacher } from '@/types/timetable';

interface SubjectAssignmentFormProps {
  currentConfig: ClassConfig | null;
  selectedSubjects: string[];
  teachers: Teacher[];
  classConfigs: ClassConfig[];
  onToggleSubject: (subject: string) => void;
  onSubjectAssignment: (subject: string, periodsPerWeek: number, teacherId: string) => void;
  onSaveConfig: () => void;
  onBack: () => void;
}

const SubjectAssignmentForm = ({
  currentConfig,
  selectedSubjects,
  teachers,
  classConfigs = [],
  onToggleSubject,
  onSubjectAssignment,
  onSaveConfig,
  onBack
}: SubjectAssignmentFormProps) => {
  if (!currentConfig) return null;

  // Get all available subjects from teachers (including custom ones)
  const availableSubjects = getAllAvailableSubjects(teachers);

  const getTotalAssignedPeriods = () => {
    // Only count periods for subjects that are selected AND have a teacher assigned
    let totalPeriods = 0;
    
    selectedSubjects.forEach(subject => {
      const assignment = currentConfig.subjectAssignments.find(a => a.subject === subject);
      if (assignment && assignment.teacherId) {
        totalPeriods += assignment.periodsPerWeek;
      }
    });
    
    return totalPeriods;
  };

  const getAvailableTeachers = (subject: string) => {
    return teachers.filter(teacher => teacher.subjects.includes(subject));
  };

  const getTeacherUsage = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return { used: 0, limit: null };
    
    // Calculate total periods across ALL classes (including current config with live updates)
    let totalUsed = 0;
    
    // Count periods from all existing class configs
    classConfigs.forEach(config => {
      config.subjectAssignments.forEach(assignment => {
        if (assignment.teacherId === teacherId) {
          totalUsed += assignment.periodsPerWeek;
        }
      });
    });
    
    // If this is the current config being edited, subtract its old assignments and add current ones
    if (currentConfig) {
      const currentClassName = `${currentConfig.class}${currentConfig.division}`;
      const existingConfig = classConfigs.find(config => 
        `${config.class}${config.division}` === currentClassName
      );
      
      // Subtract existing assignments for this class to avoid double counting
      if (existingConfig) {
        existingConfig.subjectAssignments.forEach(assignment => {
          if (assignment.teacherId === teacherId) {
            totalUsed -= assignment.periodsPerWeek;
          }
        });
      }
      
      // Add current assignments (including ALL current unsaved changes - this is the key fix)
      currentConfig.subjectAssignments.forEach(assignment => {
        if (assignment.teacherId === teacherId) {
          totalUsed += assignment.periodsPerWeek;
        }
      });
    }
    
    return { used: totalUsed, limit: teacher.periodLimit };
  };

  const checkTeacherLimitViolation = (teacherId: string, newPeriods: number, currentSubject: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.periodLimit) return false;
    
    const usage = getTeacherUsage(teacherId);
    
    // Calculate what the new total would be if we assign these periods
    const currentAssignment = currentConfig?.subjectAssignments.find(a => a.subject === currentSubject && a.teacherId === teacherId);
    const currentPeriods = currentAssignment ? currentAssignment.periodsPerWeek : 0;
    const newTotal = usage.used - currentPeriods + newPeriods;
    
    return newTotal > teacher.periodLimit;
  };

  const exceedsMaxPeriods = () => {
    const totalAssigned = getTotalAssignedPeriods();
    return totalAssigned > currentConfig.periodsPerWeek;
  };

  // Check if any teacher limit violations exist
  const hasTeacherLimitViolations = () => {
    return currentConfig.subjectAssignments.some(assignment => {
      const teacher = teachers.find(t => t.id === assignment.teacherId);
      if (!teacher || !teacher.periodLimit) return false;
      const usage = getTeacherUsage(assignment.teacherId);
      return usage.used > teacher.periodLimit;
    });
  };

  const totalAssigned = getTotalAssignedPeriods();
  const maxPeriods = currentConfig.periodsPerWeek;
  const remainingPeriods = maxPeriods - totalAssigned;

  console.log('Period calculation debug - Fixed:', {
    totalAssigned,
    maxPeriods,
    remainingPeriods,
    selectedSubjects,
    subjectAssignments: currentConfig.subjectAssignments,
    assignedSubjectsWithTeachers: currentConfig.subjectAssignments.filter(a => 
      selectedSubjects.includes(a.subject) && a.teacherId
    )
  });

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
            {hasTeacherLimitViolations() && (
              <div className="flex items-center space-x-2 mt-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Some teachers exceed their period limits</span>
              </div>
            )}
          </div>

          {/* Teacher Period Limits Overview */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-800">Teacher Period Limits (All Classes)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {teachers.map(teacher => {
                  const usage = getTeacherUsage(teacher.id);
                  const isOverLimit = usage.limit && usage.used > usage.limit;
                  const className = `${currentConfig.class}${currentConfig.division}`;
                  const isClassTeacher = teacher.isClassTeacher && teacher.classTeacherOf === className;
                  
                  return (
                    <div key={teacher.id} className={`flex items-center justify-between p-2 rounded border ${
                      isOverLimit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {isClassTeacher && <Crown className="w-3 h-3 text-yellow-600" />}
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">{teacher.name}</span>
                      </div>
                      <div className={`text-xs ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {usage.used}/{usage.limit || '∞'}
                        {isClassTeacher && <span className="ml-1 text-yellow-600">(CT)</span>}
                        {isOverLimit && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
                                const usage = getTeacherUsage(teacher.id);
                                const className = `${currentConfig.class}${currentConfig.division}`;
                                const isClassTeacher = teacher.isClassTeacher && teacher.classTeacherOf === className;
                                const wouldExceedLimit = checkTeacherLimitViolation(teacher.id, currentAssignment?.periodsPerWeek || 5, subject);
                                const isCurrentlyOverLimit = usage.limit && usage.used > usage.limit;
                                
                                return (
                                  <SelectItem 
                                    key={teacher.id} 
                                    value={teacher.id}
                                    className={isCurrentlyOverLimit || wouldExceedLimit ? 'text-red-500' : ''}
                                  >
                                    <div className="flex items-center space-x-2">
                                      {isClassTeacher && <Crown className="w-3 h-3 text-yellow-600" />}
                                      {(isCurrentlyOverLimit || wouldExceedLimit) && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                      <span>
                                        {teacher.name} (Total: {usage.used}/{usage.limit || '∞'})
                                      </span>
                                    </div>
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
                          {currentAssignment?.teacherId && checkTeacherLimitViolation(currentAssignment.teacherId, currentAssignment.periodsPerWeek, subject) && (
                            <p className="text-sm text-red-500 mt-1 flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              This assignment exceeds teacher's period limit
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
              ) || exceedsMaxPeriods() || hasTeacherLimitViolations()}
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
