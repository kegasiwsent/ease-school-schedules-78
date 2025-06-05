
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, ArrowRight } from 'lucide-react';
import type { ClassConfig } from '@/types/timetable';

interface ClassConfigFormProps {
  currentClass: string;
  currentDivision: string;
  weekdayPeriods: number;
  saturdayPeriods: number;
  includeSaturday: boolean;
  classConfigs: ClassConfig[];
  onClassChange: (value: string) => void;
  onDivisionChange: (value: string) => void;
  onWeekdayPeriodsChange: (value: number) => void;
  onSaturdayPeriodsChange: (value: number) => void;
  onIncludeSaturdayChange: (value: boolean) => void;
  onStartClassConfig: () => void;
}

const classes = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const divisions = ['A', 'B', 'C', 'D'];

const ClassConfigForm = ({
  currentClass,
  currentDivision,
  weekdayPeriods,
  saturdayPeriods,
  includeSaturday,
  classConfigs,
  onClassChange,
  onDivisionChange,
  onWeekdayPeriodsChange,
  onSaturdayPeriodsChange,
  onIncludeSaturdayChange,
  onStartClassConfig
}: ClassConfigFormProps) => {
  const calculateTotalPeriods = () => {
    const weekdayTotal = weekdayPeriods * 5;
    const saturdayTotal = includeSaturday ? saturdayPeriods : 0;
    return weekdayTotal + saturdayTotal;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Class & Division Selection</span>
          </CardTitle>
          <CardDescription>Select class, division, and configure periods per day</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Class</Label>
              <Select value={currentClass} onValueChange={onClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Division</Label>
              <Select value={currentDivision} onValueChange={onDivisionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map(div => (
                    <SelectItem key={div} value={div}>Division {div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weekdayPeriods">
                  Periods per Day (Monday - Friday)
                </Label>
                <Select value={weekdayPeriods.toString()} onValueChange={(value) => onWeekdayPeriodsChange(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select periods" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 6, 7, 8, 9].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} periods</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="saturdayPeriods">
                  Periods on Saturday
                </Label>
                <Select value={saturdayPeriods.toString()} onValueChange={(value) => onSaturdayPeriodsChange(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select periods" />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} periods</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSaturday"
                checked={includeSaturday}
                onCheckedChange={(checked) => onIncludeSaturdayChange(checked as boolean)}
              />
              <Label htmlFor="includeSaturday">Include Saturday</Label>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900">Total Periods per Week</div>
              <div className="text-sm text-blue-700 mt-1">
                Monday-Friday: {weekdayPeriods} × 5 = {weekdayPeriods * 5} periods
              </div>
              {includeSaturday && (
                <div className="text-sm text-blue-700">
                  Saturday: {saturdayPeriods} periods
                </div>
              )}
              <div className="text-lg font-bold text-blue-900 mt-2">
                Total: {calculateTotalPeriods()} periods/week
              </div>
            </div>
          </div>
          
          <Button 
            onClick={onStartClassConfig}
            disabled={!currentClass || !currentDivision}
            className="w-full"
          >
            Configure Subjects <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {classConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configured Classes ({classConfigs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {classConfigs.map((config, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-medium">{config.class}{config.division}</div>
                  <div className="text-sm text-gray-600">
                    {config.selectedSubjects.length} subjects, {config.periodsPerWeek} periods/week
                    {config.includeSaturday ? ' (incl. Saturday)' : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    Weekdays: {config.weekdayPeriods}/day, Saturday: {config.saturdayPeriods}/day
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassConfigForm;
