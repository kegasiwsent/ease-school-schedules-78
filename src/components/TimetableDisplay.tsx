import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, User, Download } from 'lucide-react';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
import TeacherTimetableDisplay from './TeacherTimetableDisplay';

interface TimetableEntry {
  subject: string;
  teacher: string;
  teacherId: string;
}

interface TeacherScheduleEntry {
  class: string;
  subject: string;
}

interface TimetableDisplayProps {
  timetables: { [className: string]: { [day: string]: (TimetableEntry | null)[] } };
  teacherSchedules?: { [teacherId: string]: { [day: string]: (TeacherScheduleEntry | null)[] } };
  teachers?: { id: string; name: string; subjects: string[] }[];
  periodsPerDay: number;
  days: string[];
}

const TimetableDisplay = ({ timetables, teacherSchedules, teachers, periodsPerDay, days }: TimetableDisplayProps) => {
  const [activeView, setActiveView] = useState<'classes' | 'teachers'>('classes');
  const { generateClassTimetablePDF, generateAllTimetablesPDF } = usePDFGenerator();

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

  const getPeriodsForDay = (day: string, className: string) => {
    // Get the actual number of periods for this day from the timetable data
    const classTimetable = timetables[className];
    if (classTimetable && classTimetable[day]) {
      return classTimetable[day].length;
    }
    // Fallback to default values
    return day === 'Saturday' ? 4 : 7;
  };

  const getMaxPeriods = (className: string) => {
    const classTimetable = timetables[className];
    if (!classTimetable) return 7;
    
    return Math.max(...days.map(day => getPeriodsForDay(day, className)));
  };

  const handleDownloadClassPDF = (className: string) => {
    const classTimetable = timetables[className];
    if (classTimetable) {
      const pdf = generateClassTimetablePDF(className, classTimetable, days);
      pdf.save(`${className}_timetable.pdf`);
    }
  };

  const handleDownloadAllPDF = () => {
    const pdf = generateAllTimetablesPDF(timetables, days);
    pdf.save('all_class_timetables.pdf');
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Generated Timetables</h3>
        <p className="text-gray-600">Optimized schedules with consecutive periods and zero conflicts</p>
        
        {/* View Toggle and Download Button */}
        <div className="flex justify-center items-center mt-4 space-x-4">
          <div className="bg-gray-100 p-1 rounded-lg">
            <Button
              variant={activeView === 'classes' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('classes')}
              className="flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Class Timetables</span>
            </Button>
            <Button
              variant={activeView === 'teachers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('teachers')}
              className="flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Teacher Timetables</span>
            </Button>
          </div>
          
          {activeView === 'classes' && (
            <Button
              onClick={handleDownloadAllPDF}
              className="flex items-center space-x-2"
              variant="outline"
            >
              <Download className="w-4 h-4" />
              <span>Download All PDFs</span>
            </Button>
          )}
        </div>
      </div>

      {activeView === 'classes' && (
        <div className="space-y-8">
          {Object.entries(timetables).map(([className, classTimetable]) => (
            <Card key={className} className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Timetable for {className}</span>
                  </CardTitle>
                  <Button
                    onClick={() => handleDownloadClassPDF(className)}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </Button>
                </div>
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
                                {getPeriodsForDay(day, className)} periods
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: getMaxPeriods(className) }, (_, periodIndex) => (
                        <tr key={periodIndex} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3 bg-gray-50 font-medium">
                            <div className="text-sm">
                              <div>Period {periodIndex + 1}</div>
                            </div>
                          </td>
                          {days.map(day => {
                            const periodsForThisDay = getPeriodsForDay(day, className);
                            const entry = periodIndex < periodsForThisDay ? classTimetable[day][periodIndex] : undefined;
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
                                    <div className="text-xs text-gray-600 text-center">
                                      {entry.teacher}
                                    </div>
                                    <div className="text-xs text-gray-500 text-center">
                                      {getPeriodTime(periodIndex, day)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-400 text-sm">
                                    <div>Free Period</div>
                                    <div className="text-xs text-gray-500">
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
                
                {/* Legend */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Subject Legend</h4>
                  <div className="flex flex-wrap gap-2">
                    {['English', 'Maths', 'SST', 'Hindi', 'Gujarati', 'Computer', 'PE'].map(subject => (
                      <Badge 
                        key={subject}
                        variant="outline" 
                        className={`${getSubjectColor(subject)} text-xs`}
                      >
                        {subject}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="font-medium mb-1">Features:</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>3-4 consecutive periods for the same teacher when possible</li>
                      <li>Zero teacher conflicts across all classes</li>
                      <li>Optimized distribution across all weekdays{days.includes('Saturday') ? ' and Saturday' : ''}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeView === 'teachers' && teacherSchedules && teachers && (
        <TeacherTimetableDisplay 
          teacherSchedules={teacherSchedules}
          teachers={teachers}
          days={days}
        />
      )}
    </div>
  );
};

export default TimetableDisplay;
