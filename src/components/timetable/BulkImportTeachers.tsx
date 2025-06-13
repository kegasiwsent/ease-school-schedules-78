
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/types/timetable';

interface ImportRow {
  name: string;
  subjects: string[];
  contactInfo?: string;
  periodLimit?: number;
  isClassTeacher?: boolean;
  classTeacherOf?: string;
  subjectPeriods: { [subject: string]: number };
}

interface ImportResult {
  success: boolean;
  row: number;
  data: ImportRow;
  error?: string;
  teacher?: Teacher;
}

interface BulkImportTeachersProps {
  teachers: Teacher[];
  onImportComplete: (results: ImportResult[]) => void;
  onTeachersImported: (teachers: Teacher[]) => void;
}

const BulkImportTeachers = ({ teachers, onImportComplete, onTeachersImported }: BulkImportTeachersProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const columns: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current.trim());
      return columns;
    });
  };

  const validateAndParseRow = (row: string[], rowIndex: number, headers: string[]): { valid: boolean; data?: ImportRow; error?: string } => {
    try {
      const data: any = {};
      headers.forEach((header, index) => {
        data[header.toLowerCase().replace(/\s+/g, '')] = row[index]?.trim() || '';
      });

      // Required fields validation
      if (!data.name) {
        return { valid: false, error: 'Teacher name is required' };
      }

      if (!data.subjects) {
        return { valid: false, error: 'Subjects are required' };
      }

      // Parse subjects (comma-separated)
      const subjects = data.subjects.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      if (subjects.length === 0) {
        return { valid: false, error: 'At least one subject is required' };
      }

      // Parse period limit
      const periodLimit = data.periodlimit ? parseInt(data.periodlimit) : 35;
      if (isNaN(periodLimit) || periodLimit < 1 || periodLimit > 50) {
        return { valid: false, error: 'Period limit must be between 1 and 50' };
      }

      // Parse class teacher info
      const isClassTeacher = data.isclassteacher?.toLowerCase() === 'true' || data.isclassteacher?.toLowerCase() === 'yes';
      
      // Parse subject periods (format: "Math:5,English:3")
      const subjectPeriods: { [subject: string]: number } = {};
      if (data.subjectperiods) {
        const periodPairs = data.subjectperiods.split(',');
        for (const pair of periodPairs) {
          const [subject, periods] = pair.split(':').map((s: string) => s.trim());
          if (subject && periods) {
            const periodCount = parseInt(periods);
            if (!isNaN(periodCount) && periodCount > 0) {
              subjectPeriods[subject] = periodCount;
            }
          }
        }
      }

      // Validate total periods don't exceed limit
      const totalPeriods = Object.values(subjectPeriods).reduce((sum, periods) => sum + periods, 0);
      if (totalPeriods > periodLimit) {
        return { valid: false, error: `Total assigned periods (${totalPeriods}) exceed teacher's limit (${periodLimit})` };
      }

      // Check if teacher already exists
      const existingTeacher = teachers.find(t => t.name.toLowerCase() === data.name.toLowerCase());
      if (existingTeacher) {
        return { valid: false, error: 'Teacher with this name already exists' };
      }

      const importRow: ImportRow = {
        name: data.name,
        subjects,
        contactInfo: data.contactinfo || undefined,
        periodLimit,
        isClassTeacher,
        classTeacherOf: isClassTeacher ? data.classteacherof || undefined : undefined,
        subjectPeriods
      };

      return { valid: true, data: importRow };
    } catch (error) {
      return { valid: false, error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Try multiple approaches to read the file
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const result = event.target?.result;
          if (typeof result === 'string') {
            console.log('File read successfully, length:', result.length);
            resolve(result);
          } else {
            console.error('Unexpected result type:', typeof result);
            reject(new Error('File content is not text'));
          }
        } catch (error) {
          console.error('Error processing file result:', error);
          reject(new Error('Failed to process file content'));
        }
      };

      reader.onerror = (event) => {
        console.error('FileReader error:', event);
        reject(new Error('File reading failed - please try a different file or browser'));
      };

      reader.onabort = () => {
        console.error('FileReader aborted');
        reject(new Error('File reading was aborted'));
      };

      try {
        // Try reading as text with UTF-8 encoding
        reader.readAsText(file, 'UTF-8');
      } catch (error) {
        console.error('Error starting file read:', error);
        reject(new Error('Failed to start reading file'));
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    console.log('File selected:', uploadedFile.name, 'Size:', uploadedFile.size, 'Type:', uploadedFile.type);

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive"
      });
      return;
    }

    // Check file size (limit to 5MB)
    if (uploadedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    // Check if file is empty
    if (uploadedFile.size === 0) {
      toast({
        title: "Empty File",
        description: "The selected file is empty. Please choose a file with data.",
        variant: "destructive"
      });
      return;
    }

    setFile(uploadedFile);
    setResults([]);
    setShowResults(false);
  };

  const processImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResults([]);

    try {
      console.log('Starting import process for file:', file.name);
      
      const text = await readFileAsText(file);
      
      if (!text || text.trim().length === 0) {
        throw new Error('File appears to be empty or contains no readable content');
      }

      console.log('File content preview:', text.substring(0, 200) + '...');

      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);
      const importResults: ImportResult[] = [];
      const successfulTeachers: Teacher[] = [];

      console.log('Headers found:', headers);
      console.log('Data rows:', dataRows.length);

      // Validate required headers
      const requiredHeaders = ['name', 'subjects'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because of header and 0-based index
        
        setProgress(((i + 1) / dataRows.length) * 100);

        if (row.every(cell => !cell.trim())) {
          // Skip empty rows
          continue;
        }

        const validation = validateAndParseRow(row, rowNumber, headers);
        
        if (!validation.valid) {
          importResults.push({
            success: false,
            row: rowNumber,
            data: {} as ImportRow,
            error: validation.error
          });
          continue;
        }

        const importRow = validation.data!;
        
        // Create teacher object
        const newTeacher: Teacher = {
          id: `imported-${Date.now()}-${i}`,
          name: importRow.name,
          subjects: importRow.subjects,
          contactInfo: importRow.contactInfo,
          assignedPeriods: importRow.subjectPeriods,
          periodLimit: importRow.periodLimit || 35,
          isClassTeacher: importRow.isClassTeacher || false,
          classTeacherOf: importRow.classTeacherOf
        };

        successfulTeachers.push(newTeacher);
        importResults.push({
          success: true,
          row: rowNumber,
          data: importRow,
          teacher: newTeacher
        });
      }

      console.log('Import results:', importResults);

      setResults(importResults);
      setShowResults(true);
      onImportComplete(importResults);

      if (successfulTeachers.length > 0) {
        onTeachersImported(successfulTeachers);
      }

      const successCount = importResults.filter(r => r.success).length;
      const failCount = importResults.filter(r => !r.success).length;

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} teachers. ${failCount} rows failed.`,
        variant: successCount > 0 ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred during file import",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'name,subjects,contactinfo,periodlimit,isclassteacher,classteacherof,subjectperiods',
      'John Smith,"Math,Science",john.smith@school.edu,35,true,10A,"Math:5,Science:3"',
      'Jane Doe,"English,History",jane.doe@school.edu,40,false,,"English:4,History:4"'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const successfulImports = results.filter(r => r.success);
  const failedImports = results.filter(r => !r.success);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Bulk Import Teachers</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import multiple teachers with their subject assignments and period allocations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <FileText className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <span className="text-sm text-gray-500">Start with our template for proper formatting</span>
          </div>

          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>CSV Format Requirements:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• <strong>name</strong> (required): Teacher's full name</li>
                <li>• <strong>subjects</strong> (required): Comma-separated list (e.g., "Math,Science")</li>
                <li>• <strong>contactinfo</strong> (optional): Email or phone</li>
                <li>• <strong>periodlimit</strong> (optional): Max periods per week (default: 35)</li>
                <li>• <strong>isclassteacher</strong> (optional): true/false or yes/no</li>
                <li>• <strong>classteacherof</strong> (optional): Class designation if class teacher</li>
                <li>• <strong>subjectperiods</strong> (optional): Format "Subject:Periods" (e.g., "Math:5,English:3")</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="csv-upload">Select CSV File (Max 5MB)</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing}
            />
          </div>

          {file && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <Button 
                onClick={processImport} 
                disabled={importing}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Importing...' : 'Import Teachers'}</span>
              </Button>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing import...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {showResults && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Import Results</span>
            </CardTitle>
            <CardDescription>
              {successfulImports.length} successful, {failedImports.length} failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Success</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{successfulImports.length}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-800">Failed</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{failedImports.length}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Total</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{results.length}</div>
                </div>
              </div>

              {/* Successful Imports */}
              {successfulImports.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Successfully Imported Teachers:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {successfulImports.map((result) => (
                      <div key={result.row} className="p-2 bg-green-50 rounded border-l-4 border-green-400">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.data.name}</span>
                          <span className="text-sm text-green-600">Row {result.row}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Subjects: {result.data.subjects.join(', ')} | 
                          Periods: {Object.entries(result.data.subjectPeriods).map(([subject, periods]) => `${subject}:${periods}`).join(', ') || 'None assigned'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Imports */}
              {failedImports.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-800 mb-2">Failed Imports:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {failedImports.map((result) => (
                      <div key={result.row} className="p-2 bg-red-50 rounded border-l-4 border-red-400">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Row {result.row}</span>
                          <XCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="text-sm text-red-600">{result.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkImportTeachers;
