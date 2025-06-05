
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles, Clock } from 'lucide-react';
import type { Teacher, ClassConfig } from '@/types/timetable';

interface StepNavigationProps {
  currentStep: number;
  teachers: Teacher[];
  classConfigs: ClassConfig[];
  isGenerating: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGenerateTimetables: () => void;
}

const StepNavigation = ({
  currentStep,
  teachers,
  classConfigs,
  isGenerating,
  onPrevious,
  onNext,
  onGenerateTimetables
}: StepNavigationProps) => {
  return (
    <div className="flex justify-between">
      <div>
        {currentStep > 1 && currentStep !== 4 && (
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous Step
          </Button>
        )}
      </div>
      
      <div>
        {currentStep === 1 && teachers.length > 0 && (
          <Button onClick={onNext}>
            Next: Select Classes
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        
        {currentStep === 2 && classConfigs.length > 0 && (
          <Button onClick={onGenerateTimetables} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Timetables
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StepNavigation;
