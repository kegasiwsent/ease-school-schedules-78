import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from './TimetableDisplay';
import TeacherForm from './timetable/TeacherForm';
import TeacherList from './timetable/TeacherList';
import BulkImportTeachers from './timetable/BulkImportTeachers';
import ClassConfigForm from './timetable/ClassConfigForm';
import SubjectAssignmentForm from './timetable/SubjectAssignmentForm';
import StepNavigation from './timetable/StepNavigation';
import { useTimetableGeneration } from '@/hooks/useTimetableGeneration';
import { useTeachers } from '@/hooks/useTeachers';
import { useTimetableHistory } from '@/hooks/useTimetableHistory';
import type { Teacher, ClassConfig, GeneratedTimetables } from '@/types/timetable';

const TimetableGenerator = () => {
  const { toast } = useToast();
  const { generateTimetables: generateTimetablesHook } = useTimetableGeneration();
  const { teachers, saveTeacher, updateTeacher, deleteTeacher, loading: teachersLoading } = useTeachers();
  const { saveTimetable } = useTimetableHistory();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 2 & 3: Class Configuration
  const [classConfigs, setClassConfigs] = useState<ClassConfig[]>([]);
  const [currentClass, setCurrentClass] = useState('');
  const [currentDivision, setCurrentDivision] = useState('');
  const [selectedClassTeacher, setSelectedClassTeacher] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [weekdayPeriods, setWeekdayPeriods] = useState(7);
  const [saturdayPeriods, setSaturdayPeriods] = useState(4);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  
  // Step 4: Subject Assignments
  const [currentConfig, setCurrentConfig] = useState<ClassConfig | null>(null);
  
  // Step 5: Generated Timetables
  const [generatedTimetables, setGeneratedTimetables] = useState<GeneratedTimetables | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate total periods per week
  const calculateTotalPeriods = () => {
    const weekdayTotal = weekdayPeriods * 5;
    const saturdayTotal = includeSaturday ? saturdayPeriods : 0;
    return weekdayTotal + saturdayTotal;
  };

  // Step 1: Teacher Management
  const handleAddTeacher = async (newTeacher: Teacher) => {
    await saveTeacher(newTeacher);
  };

  const handleUpdateTeacher = async (id: string, updatedFields: Partial<Teacher>) => {
    await updateTeacher(id, updatedFields);
  };

  const handleRemoveTeacher = async (id: string) => {
    await deleteTeacher(id);
  };

  // Handle bulk import of teachers
  const handleBulkImport = (results: any[]) => {
    console.log('Bulk import completed:', results);
  };

  const handleTeachersImported = async (importedTeachers: Teacher[]) => {
    for (const teacher of importedTeachers) {
      await saveTeacher(teacher);
    }
  };

  // Step 2-3: Class Configuration
  const handleStartClassConfig = () => {
    if (currentClass && currentDivision && selectedClassTeacher) {
      const totalPeriods = calculateTotalPeriods();
      
      const existingConfig = classConfigs.find(
        config => config.class === currentClass && config.division === currentDivision
      );
      
      if (existingConfig) {
        setCurrentConfig(existingConfig);
        setSelectedSubjects(existingConfig.selectedSubjects);
        setWeekdayPeriods(existingConfig.weekdayPeriods);
        setSaturdayPeriods(existingConfig.saturdayPeriods);
        setIncludeSaturday(existingConfig.includeSaturday);
        setSelectedClassTeacher(existingConfig.classTeacherId || '');
      } else {
        const newConfig: ClassConfig = {
          class: currentClass,
          division: currentDivision,
          classTeacherId: selectedClassTeacher,
          selectedSubjects: [],
          selectedMainSubjects: [],
          selectedExtraSubjects: [],
          subjectAssignments: [],
          periodsPerWeek: totalPeriods,
          weekdayPeriods: weekdayPeriods,
          saturdayPeriods: saturdayPeriods,
          includeSaturday: includeSaturday
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

  // Step 4: Subject Assignment - Updated to handle main/extra subjects
  const handleSubjectAssignment = (subject: string, periodsPerWeek: number, teacherId: string, isMainSubject: boolean) => {
    if (!currentConfig) return;

    const updatedConfig = { ...currentConfig };
    updatedConfig.selectedSubjects = selectedSubjects;
    updatedConfig.periodsPerWeek = calculateTotalPeriods();
    updatedConfig.weekdayPeriods = weekdayPeriods;
    updatedConfig.saturdayPeriods = saturdayPeriods;
    updatedConfig.includeSaturday = includeSaturday;
    updatedConfig.classTeacherId = selectedClassTeacher;
    
    // Update main/extra subject lists
    if (isMainSubject) {
      if (!updatedConfig.selectedMainSubjects.includes(subject)) {
        updatedConfig.selectedMainSubjects.push(subject);
      }
      updatedConfig.selectedExtraSubjects = updatedConfig.selectedExtraSubjects.filter(s => s !== subject);
    } else {
      if (!updatedConfig.selectedExtraSubjects.includes(subject)) {
        updatedConfig.selectedExtraSubjects.push(subject);
      }
      updatedConfig.selectedMainSubjects = updatedConfig.selectedMainSubjects.filter(s => s !== subject);
    }
    
    const existingAssignment = updatedConfig.subjectAssignments.find(a => a.subject === subject);
    if (existingAssignment) {
      existingAssignment.periodsPerWeek = periodsPerWeek;
      existingAssignment.teacherId = teacherId;
      existingAssignment.isMainSubject = isMainSubject;
    } else {
      updatedConfig.subjectAssignments.push({
        subject,
        periodsPerWeek,
        teacherId,
        isMainSubject
      });
    }
    
    setCurrentConfig(updatedConfig);
  };

  // Add the missing saveClassConfig function
  const saveClassConfig = () => {
    if (!currentConfig) return;

    const updatedConfig = { ...currentConfig };
    
    // Update class configs list
    const existingIndex = classConfigs.findIndex(
      config => config.class === updatedConfig.class && config.division === updatedConfig.division
    );
    
    if (existingIndex >= 0) {
      const newConfigs = [...classConfigs];
      newConfigs[existingIndex] = updatedConfig;
      setClassConfigs(newConfigs);
    } else {
      setClassConfigs(prev => [...prev, updatedConfig]);
    }

    // Reset form state
    setCurrentConfig(null);
    setCurrentClass('');
    setCurrentDivision('');
    setSelectedClassTeacher('');
    setSelectedSubjects([]);
    setCurrentStep(2);

    toast({
      title: "Class Configuration Saved",
      description: `Configuration for ${updatedConfig.class}${updatedConfig.division} has been saved.`,
    });
  };

  // Step 5: Generate Timetables
  const handleGenerateTimetables = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generateTimetablesHook(teachers, classConfigs);
      setGeneratedTimetables(result);
      
      const timestamp = new Date().toLocaleString();
      const timetableName = `Timetable - ${timestamp}`;
      await saveTimetable(timetableName, result, classConfigs, teachers);
      
      setCurrentStep(5);
      
      toast({
        title: "Enhanced Timetables Generated! 🎉",
        description: `Successfully generated and saved optimized timetables.`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "There was an error generating the timetables. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <TeacherForm teachers={teachers} onAddTeacher={handleAddTeacher} />
            <BulkImportTeachers 
              teachers={teachers}
              onImportComplete={handleBulkImport}
              onTeachersImported={handleTeachersImported}
            />
            <TeacherList 
              teachers={teachers} 
              onUpdateTeacher={handleUpdateTeacher}
              onRemoveTeacher={handleRemoveTeacher}
            />
          </div>
        );

      case 2:
        return (
          <ClassConfigForm
            currentClass={currentClass}
            currentDivision={currentDivision}
            selectedClassTeacher={selectedClassTeacher}
            weekdayPeriods={weekdayPeriods}
            saturdayPeriods={saturdayPeriods}
            includeSaturday={includeSaturday}
            classConfigs={classConfigs}
            teachers={teachers}
            onClassChange={setCurrentClass}
            onDivisionChange={setCurrentDivision}
            onClassTeacherChange={setSelectedClassTeacher}
            onWeekdayPeriodsChange={setWeekdayPeriods}
            onSaturdayPeriodsChange={setSaturdayPeriods}
            onIncludeSaturdayChange={setIncludeSaturday}
            onStartClassConfig={handleStartClassConfig}
          />
        );

      case 4:
        return (
          <SubjectAssignmentForm
            currentConfig={currentConfig}
            selectedSubjects={selectedSubjects}
            teachers={teachers}
            classConfigs={classConfigs}
            onToggleSubject={toggleSubject}
            onSubjectAssignment={handleSubjectAssignment}
            onSaveConfig={saveClassConfig}
            onBack={() => setCurrentStep(2)}
          />
        );

      case 5:
        return (
          <div className="space-y-6">
            {generatedTimetables && (
              <TimetableDisplay 
                timetables={generatedTimetables.timetables}
                teacherSchedules={generatedTimetables.teacherSchedules}
                teachers={teachers}
                periodsPerDay={7}
                days={generatedTimetables.days}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Step 1: Add Teachers';
      case 2: return 'Step 2: Configure Class & Class Teacher';
      case 4: return 'Step 3: Configure Subjects';
      case 5: return 'Step 4: Generated Timetables';
      default: return '';
    }
  };

  if (teachersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading teachers...</p>
        </div>
      </div>
    );
  }

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
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{getStepTitle()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <StepNavigation
        currentStep={currentStep}
        teachers={teachers}
        classConfigs={classConfigs}
        isGenerating={isGenerating}
        onPrevious={() => setCurrentStep(currentStep - 1)}
        onNext={() => setCurrentStep(currentStep + 1)}
        onGenerateTimetables={handleGenerateTimetables}
      />
    </div>
  );
};

export default TimetableGenerator;
