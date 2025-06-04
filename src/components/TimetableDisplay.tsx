
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';

interface TimetableEntry {
  subject: string;
  teacher: string;
  teacherId: string;
}

interface TimetableDisplayProps {
  timetables: { [className: string]: { [day: string]: (TimetableEntry | null)[] } };
  periodsPerDay: number;
  days: string[];
}

const TimetableDisplay = ({ timetables, periodsPerDay, days }: TimetableDisplayProps) => {
  const getSubjectColor = (subject: string) => {
    const colors = {
      'Mathematics': 'bg-blue-100 text-blue-800 border-blue-200',
      'Science': 'bg-green-100 text-green-800 border-green-200',
      'English': 'bg-purple-100 text-purple-800 border-purple-200',
      'Social Studies': 'bg-orange-100 text-orange-800 border-orange-200',
      'default': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[subject as keyof typeof colors] || colors.default;
  };

  const getPeriodTime = (periodIndex: number) => {
    const startHour = 9; // School starts at 9 AM
    const periodDuration = 45; // 45 minutes per period
    const breakDuration = 15; // 15 minutes break between periods
    
    const totalMinutes = periodIndex * (periodDuration + breakDuration);
    const hour = startHour + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    
    const endHour = hour + Math.floor((minute + periodDuration) / 60);
    const endMinute = (minute + periodDuration) % 60;
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Generated Timetables</h3>
        <p className="text-gray-600">Optimized schedules with zero conflicts</p>
      </div>

      {Object.entries(timetables).map(([className, classTimetable]) => (
        <Card key={className} className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Timetable for {className}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-50 p-3 text-left font-medium">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Time / Day</span>
                      </div>
                    </th>
                    {days.map(day => (
                      <th key={day} className="border border-gray-300 bg-gray-50 p-3 text-center font-medium min-w-[150px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: periodsPerDay }, (_, periodIndex) => (
                    <tr key={periodIndex} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3 bg-gray-50 font-medium">
                        <div className="text-sm">
                          <div>Period {periodIndex + 1}</div>
                          <div className="text-xs text-gray-500">
                            {getPeriodTime(periodIndex)}
                          </div>
                        </div>
                      </td>
                      {days.map(day => {
                        const entry = classTimetable[day][periodIndex];
                        return (
                          <td key={day} className="border border-gray-300 p-2">
                            {entry ? (
                              <div className="space-y-1">
                                <Badge 
                                  variant="outline" 
                                  className={`${getSubjectColor(entry.subject)} w-full justify-center text-xs font-medium`}
                                >
                                  {entry.subject}
                                </Badge>
                                <div className="text-xs text-gray-600 text-center">
                                  {entry.teacher}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-400 text-sm">
                                Free Period
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Subject Legend</h4>
              <div className="flex flex-wrap gap-2">
                {['Mathematics', 'Science', 'English', 'Social Studies'].map(subject => (
                  <Badge 
                    key={subject}
                    variant="outline" 
                    className={`${getSubjectColor(subject)} text-xs`}
                  >
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TimetableDisplay;
