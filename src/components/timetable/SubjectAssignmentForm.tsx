import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertCircle, User, Crown, AlertTriangle, BookOpen, Palette } from 'lucide-react';
import { getAllAvailableSubjects } from '@/utils/subjectUtils';
import type { ClassConfig, Teacher } from '@/types/timetable';

interface SubjectAssignmentFormProps {
  currentConfig: ClassConfig | null;
  selectedSubjects: string[];
  teachers: Teacher[];
  classConfigs: ClassConfig[];
  onToggleSubject: (subject: string) => void;
  onSubjectAssignment: (subject: string, periodsPerWeek: number, teacherId: string, isMainSubject: boolean) => void;
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

  // Get all available subjects separated by type
  const getAllMainSubjects = () => {
    const subjectSet = new Set<string>();
    teachers.forEach(teacher => {
      teacher.mainSubjects?.forEach(subject => subjectSet.add(subject));
    });
    return Array.from(subjectSet).sort();
  };

  const getAllExtraSubjects = () => {
    const subjectSet = new Set<string>();
    teachers.forEach(teacher => {
      teacher.extraSubjects?.forEach(subject => subjectSet.add(subject));
    });
    return Array.from(subjectSet).sort();
  };

  const availableMainSubjects = getAllMainSubjects();
  const availableExtraSubjects = getAllExtraSubjects();

  // Handle main subject toggle
  const handleMainSubjectToggle = (subject: string) => {
    const isCurrentlySelected = selectedSubjects.includes(subject);
    
    // Toggle the subject in selectedSubjects
    onToggleSubject(subject);
    
    // Update the config's main/extra subject lists
    if (!isCurrentlySelected) {
      // Adding subject
      if (!currentConfig.selectedMainSubjects.includes(subject)) {
        currentConfig.selectedMainSubjects.push(subject);
      }
      // Remove from extra subjects if it was there
      currentConfig.selectedExtraSubjects = currentConfig.selectedExtraSubjects.filter(s => s !== subject);
    } else {
      // Removing subject
      currentConfig.selectedMainSubjects = currentConfig.selectedMainSubjects.filter(s => s !== subject);
      // Remove any assignments for this subject
      currentConfig.subjectAssignments = currentConfig.subjectAssignments.filter(a => a.subject !== subject);
    }
  };

  // Handle extra subject toggle
  const handleExtraSubjectToggle = (subject: string) => {
    const isCurrentlySelected = selectedSubjects.includes(subject);
    
    // Toggle the subject in selectedSubjects
    onToggleSubject(subject);
    
    // Update the config's main/extra subject lists
    if (!isCurrentlySelected) {
      // Adding subject
      if (!currentConfig.selectedExtraSubjects.includes(subject)) {
        currentConfig.selectedExtraSubjects.push(subject);
      }
      // Remove from main subjects if it was there
      currentConfig.selectedMainSubjects = currentConfig.selectedMainSubjects.filter(s => s !== subject);
    } else {
      // Removing subject
      currentConfig.selectedExtraSubjects = currentConfig.selectedExtraSubjects.filter(s => s !== subject);
      // Remove any assignments for this subject
      currentConfig.subjectAssignments = currentConfig.subjectAssignments.filter(a => a.subject !== subject);
    }
  };

  const getTotalAssignedPeriods = () => {
    let totalPeriods = 0;
    
    selectedSubjects.forEach(subject => {
      const assignment = currentConfig.subjectAssignments.find(a => a.subject === subject);
      if (assignment && assignment.teacherId) {
        totalPeriods += assignment.periodsPerWeek;
      }
    });
    
    return totalPeriods;
  };

  const getAvailableTeachers = (subject: string, isMainSubject: boolean) => {
    return teachers.filter(teacher => {
      if (isMainSubject) {
        return teacher.mainSubjects?.includes(subject);
      } else {
        return teacher.extraSubjects?.includes(subject);
      }
    });
  };

  const getTeacherUsage = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return { used: 0, limit: null };
    
    let totalUsed = 0;
    
    classConfigs.forEach(config => {
      config.subjectAssignments.forEach(assignment => {
        if (assignment.teacherId === teacherId) {
          totalUsed += assignment.periodsPerWeek;
        }
      });
    });
    
    if (currentConfig) {
      const currentClassName = `${currentConfig.class}${currentConfig.division}`;
      const existingConfig = classConfigs.find(config => 
        `${config.class}${config.division}` === currentClassName
      );
      
      if (existingConfig) {
        existingConfig.subjectAssignments.forEach(assignment => {
          if (assignment.teacherId === teacherId) {
            totalUsed -= assignment.periodsPerWeek;
          }
        });
      }
      
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
    const currentAssignment = currentConfig?.subjectAssignments.find(a => a.subject === currentSubject && a.teacherId === teacherId);
    const currentPeriods = currentAssignment ? currentAssignment.periodsPerWeek : 0;
    const newTotal = usage.used - currentPeriods + newPeriods;
    
    return newTotal > teacher.periodLimit;
  };

  const exceedsMaxPeriods = () => {
    const totalAssigned = getTotalAssignedPeriods();
    return totalAssigned > currentConfig.periodsPerWeek;
  };

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

  const renderSubjectSection = (subjects: string[], title: string, icon: React.ReactNode, isMainSubject: boolean, bgColor: string) => (
    <div className={`p-4 ${bgColor} rounded-lg`}>
      <Label className="flex items-center space-x-2 text-base font-medium mb-3">
        {icon}
        <span>{title}</span>
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {subjects.map(subject => (
          <div key={subject} className="flex items-center space-x-2">
            <Checkbox
              id={`${isMainSubject ? 'main' : 'extra'}-subject-${subject}`}
              checked={selectedSubjects.includes(subject)}
              onCheckedChange={() => isMainSubject ? handleMainSubjectToggle(subject) : handleExtraSubjectToggle(subject)}
            />
            <Label htmlFor={`${isMainSubject ? 'main' : 'extra'}-subject-${subject}`} className="text-sm">{subject}</Label>
          </div>
        ))}
      </div>
    </div>
  );

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
            Select main and extra subjects, then assign teachers. Total periods: {currentConfig.periodsPerWeek}
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

          {/* Subject Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Subjects</Label>
            
            {/* Main Subjects */}
            {renderSubjectSection(
              availableMainSubjects, 
              "Main Subjects", 
              <BookOpen className="w-4 h-4" />, 
              true, 
              "bg-blue-50"
            )}
            
            {/* Extra Subjects */}
            {renderSubjectSection(
              availableExtraSubjects, 
              "Extra Subjects", 
              <Palette className="w-4 h-4" />, 
              false, 
              "bg-green-50"
            )}
          </div>

          {/* Subject Assignment */}
          {selectedSubjects.length > 0 && (
            <div>
              <Label className="text-base font-medium">Assign Teachers & Periods</Label>
              <div className="space-y-4 mt-4">
                {selectedSubjects.map(subject => {
                  const isMainSubject = availableMainSubjects.includes(subject);
                  const availableTeachers = getAvailableTeachers(subject, isMainSubject);
                  const currentAssignment = currentConfig.subjectAssignments.find(a => a.subject === subject);
                  
                  return (
                    <div key={subject} className={`p-4 border rounded-lg ${isMainSubject ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center space-x-2 mb-3">
                        {isMainSubject ? <BookOpen className="w-4 h-4 text-blue-600" /> : <Palette className="w-4 h-4 text-green-600" />}
                        <div className="font-medium">{subject}</div>
                        <span className={`text-xs px-2 py-1 rounded ${isMainSubject ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}`}>
                          {isMainSubject ? 'Main' : 'Extra'}
                        </span>
                      </div>
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
                                onSubjectAssignment(subject, periods, teacherId, isMainSubject);
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
                              onSubjectAssignment(subject, periods, teacherId, isMainSubject);
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
