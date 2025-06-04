
import React, { useState } from 'react';
import { Calendar, Users, BookOpen, Settings, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimetableGenerator from '@/components/TimetableGenerator';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const { toast } = useToast();

  const handleNavigation = (section: string) => {
    setActiveSection(section);
    toast({
      title: "Navigation",
      description: `Switched to ${section}`,
    });
  };

  const stats = [
    { title: 'Total Classes', value: '24', icon: Users, color: 'bg-blue-500' },
    { title: 'Active Teachers', value: '48', icon: BookOpen, color: 'bg-green-500' },
    { title: 'Subjects', value: '12', icon: Calendar, color: 'bg-purple-500' },
    { title: 'Generated Timetables', value: '6', icon: Clock, color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">EduEase</h1>
                <p className="text-sm text-gray-600">School Management System</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Button
                variant={activeSection === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('dashboard')}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant={activeSection === 'timetable' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('timetable')}
                className="flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Timetable Generator</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'dashboard' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to EduEase
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Streamline your school operations with our intelligent management system. 
                Generate optimized timetables, manage resources, and enhance educational efficiency.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" 
                    onClick={() => handleNavigation('timetable')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Automatic Timetable Generator
                    <ChevronRight className="w-5 h-5" />
                  </CardTitle>
                  <CardDescription>
                    Generate optimized weekly timetables without conflicts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Automated scheduling algorithm</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Teacher conflict prevention</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span>Balanced subject distribution</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                  <CardDescription>
                    Current system status and recent activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">System Status</span>
                      <span className="text-sm font-medium text-green-600">Online</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Backup</span>
                      <span className="text-sm font-medium">2 hours ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active Users</span>
                      <span className="text-sm font-medium">156</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'timetable' && (
          <TimetableGenerator />
        )}
      </main>
    </div>
  );
};

export default Index;
