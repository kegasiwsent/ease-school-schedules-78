
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, Coffee } from 'lucide-react';

interface TeacherScheduleEntry {
  class: string;
  subject: string;
}

interface TeacherTimetableDisplayProps {
  teacherSchedules: { [teacherId: string]: { [day: string]: (TeacherScheduleEntry | null)[] } };
  teachers: { id: string; name: string; subjects: string[] }[];
  days: string[];
}

const TeacherTimetableDisplay = ({ teacherSchedules, teachers, days }: TeacherTimetableDisplayProps) => {
  const getSubjectColor = (subject: string) => {
    const colors = {
      'English': 'bg-purple-100 text-purple-800 border-purple-200',
      'Maths': 'bg-blue-100 text-blue-800 border-blue-200',
      'SST': 'bg-orange-100 text-orange-800 border-orange-200',
      'Hindi': 'bg-red-100 text-red-800 border-red-200',
      'Gujarati': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Computer': 'bg-green-100 text-green-800 border-green-200',
      'PE': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'default': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[subject as keyof typeof colors] || colors.default;
  };

  const getPeriodTime = (periodIndex: number, day: string) => {
    const startHour = 9; // School starts at 9 AM
    const periodDuration = day === 'Saturday' ? 40 : 45; // Saturday has shorter periods
    const breakDuration = 15; // 15 minutes break between periods
    
    const totalMinutes = periodIndex * (periodDuration + breakDuration);
    const hour = startHour + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    
    const endHour = hour + Math.floor((minute + periodDuration) / 60);
    const endMinute = (minute + periodDuration) % 60;
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  const getMaxPeriods = () => {
    let maxPeriods = 0;
    Object.values(teacherSchedules).forEach(schedule => {
      days.forEach(day => {
        if (schedule[day]) {
          maxPeriods = Math.max(maxPeriods, schedule[day].length);
        }
      });
    });
    return maxPeriods || 7;
  };

  const getPeriodsForDay = (day: string) => {
    return day === 'Saturday' ? 4 : 7;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Teacher Timetables</h3>
        <p className="text-gray-600">Individual schedules with personal time and balanced workload</p>
      </div>

      {teachers.map(teacher => {
        const schedule = teacherSchedules[teacher.id];
        if (!schedule) return null;

        return (
          <Card key={teacher.id} className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>{teacher.name}</span>
                <Badge variant="outline" className="ml-2">
                  {teacher.subjects.join(', ')}
                </Badge>
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
                          <div>
                            <div>{day}</div>
                            <div className="text-xs text-gray-500">
                              {getPeriodsForDay(day)} periods
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: getMaxPeriods() }, (_, periodIndex) => (
                      <tr key={periodIndex} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3 bg-gray-50 font-medium">
                          <div className="text-sm">
                            <div>Period {periodIndex + 1}</div>
                          </div>
                        </td>
                        {days.map(day => {
                          const periodsForThisDay = getPeriodsForDay(day);
                          const entry = periodIndex < periodsForThisDay ? schedule[day]?.[periodIndex] : undefined;
                          const isValidPeriod = periodIndex < periodsForThisDay;
                          
                          return (
                            <td key={day} className={`border border-gray-300 p-2 ${!isValidPeriod ? 'bg-gray-100' : ''}`}>
                              {!isValidPeriod ? (
                                <div className="text-center text-gray-400 text-sm">
                                  —
                                </div>
                              ) : entry ? (
                                <div className="space-y-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`${getSubjectColor(entry.subject)} w-full justify-center text-xs font-medium`}
                                  >
                                    {entry.subject}
                                  </Badge>
                                  <div className="text-xs text-gray-600 text-center font-medium">
                                    {entry.class}
                                  </div>
                                  <div className="text-xs text-gray-500 text-center">
                                    {getPeriodTime(periodIndex, day)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-green-600 text-sm">
                                  <div className="flex items-center justify-center space-x-1">
                                    <Coffee className="w-3 h-3" />
                                    <span>Personal Time</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {getPeriodTime(periodIndex, day)}
                                  </div>
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
              
              {/* Teacher Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Weekly Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Total Teaching Periods:</div>
                    <div className="font-medium">
                      {days.reduce((total, day) => {
                        const daySchedule = schedule[day] || [];
                        return total + daySchedule.filter(entry => entry !== null).length;
                      }, 0)} periods
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Personal Time Periods:</div>
                    <div className="font-medium text-green-600">
                      {days.reduce((total, day) => {
                        const daySchedule = schedule[day] || [];
                        const maxForDay = getPeriodsForDay(day);
                        return total + Math.max(0, maxForDay - daySchedule.filter(entry => entry !== null).length);
                      }, 0)} periods
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Coffee className="w-3 h-3" />
                    <span>Personal time includes preparation, breaks, and administrative tasks</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TeacherTimetableDisplay;
