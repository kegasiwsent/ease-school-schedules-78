
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Download } from 'lucide-react';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';

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
  const { generateTeacherTimetablePDF } = usePDFGenerator();

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

  const getMaxPeriods = (teacherId: string) => {
    const schedule = teacherSchedules[teacherId];
    if (!schedule) return 7;
    return Math.max(...days.map(day => schedule[day]?.length || 0));
  };

  const handleDownloadTeacherPDF = (teacherId: string, teacherName: string) => {
    const teacherSchedule = teacherSchedules[teacherId];
    if (teacherSchedule) {
      const pdf = generateTeacherTimetablePDF(teacherName, teacherSchedule, days);
      pdf.save(`${teacherName.replace(/\s+/g, '_')}_timetable.pdf`);
    }
  };

  return (
    <div className="space-y-8">
      {teachers.map(teacher => {
        const schedule = teacherSchedules[teacher.id];
        if (!schedule) return null;

        return (
          <Card key={teacher.id} className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>{teacher.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {teacher.subjects.join(', ')}
                  </Badge>
                </CardTitle>
                <Button
                  onClick={() => handleDownloadTeacherPDF(teacher.id, teacher.name)}
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
                        Period
                      </th>
                      {days.map(day => (
                        <th key={day} className="border border-gray-300 bg-gray-50 p-3 text-center font-medium min-w-[150px]">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: getMaxPeriods(teacher.id) }, (_, periodIndex) => (
                      <tr key={periodIndex} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3 bg-gray-50 font-medium">
                          Period {periodIndex + 1}
                        </td>
                        {days.map(day => {
                          const entry = schedule[day]?.[periodIndex];
                          const isValidPeriod = periodIndex < (schedule[day]?.length || 0);
                          
                          return (
                            <td key={day} className={`border border-gray-300 p-2 ${!isValidPeriod ? 'bg-gray-100' : ''}`}>
                              {!isValidPeriod ? (
                                <div className="text-center text-gray-400 text-sm">
                                  —
                                </div>
                              ) : entry ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-sm text-center">
                                    {entry.class}
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={`${getSubjectColor(entry.subject)} w-full justify-center text-xs`}
                                  >
                                    {entry.subject}
                                  </Badge>
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TeacherTimetableDisplay;
