
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Calendar, Users, Trash2, Eye } from 'lucide-react';
import { useTimetableHistory, type TimetableHistoryItem } from '@/hooks/useTimetableHistory';
import TimetableDisplay from './TimetableDisplay';

const TimetableHistory = () => {
  const { history, loading, deleteTimetable } = useTimetableHistory();
  const [viewingTimetable, setViewingTimetable] = useState<TimetableHistoryItem | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewTimetable = (item: TimetableHistoryItem) => {
    setViewingTimetable(item);
  };

  const handleDeleteTimetable = async (id: string) => {
    if (confirm('Are you sure you want to delete this timetable from history?')) {
      await deleteTimetable(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading timetable history...</p>
        </div>
      </div>
    );
  }

  if (viewingTimetable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Viewing: {viewingTimetable.name}</h2>
          <Button onClick={() => setViewingTimetable(null)} variant="outline">
            Back to History
          </Button>
        </div>
        
        <TimetableDisplay
          timetables={viewingTimetable.timetable_data}
          teacherSchedules={viewingTimetable.teacher_schedules}
          teachers={viewingTimetable.teachers_data}
          periodsPerDay={7}
          days={viewingTimetable.days}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Timetable History
        </h2>
        <p className="text-lg text-gray-600">
          View and manage your previously generated timetables
        </p>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Timetables Yet</h3>
            <p className="text-gray-500">
              Generate your first timetable to see it appear in the history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {history.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>{item.name}</span>
                    </CardTitle>
                    <CardDescription>
                      Created on {formatDate(item.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewTimetable(item)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTimetable(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>{item.teachers_data.length} Teachers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span>{item.class_configs.length} Classes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>{item.days.length} Days</span>
                  </div>
                  <div className="text-gray-500">
                    {item.days.join(', ')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimetableHistory;
