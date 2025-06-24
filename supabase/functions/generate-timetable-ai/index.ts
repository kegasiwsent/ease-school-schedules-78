
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teachers, classConfigs } = await req.json();

    // Create a comprehensive prompt for Gemini
    const prompt = `
You are an expert timetable generator. Generate an optimized school timetable based on the following data:

TEACHERS:
${teachers.map(teacher => 
  `- ${teacher.name} (ID: ${teacher.id})
    Main Subjects: ${teacher.mainSubjects?.join(', ') || teacher.subjects.join(', ')}
    Extra Subjects: ${teacher.extraSubjects?.join(', ') || ''}
    Period Limit: ${teacher.periodLimit || 'No limit'}
    Class Teacher: ${teacher.isClassTeacher ? `Yes (${teacher.classTeacherOf || 'Not specified'})` : 'No'}`
).join('\n')}

CLASSES & SUBJECT REQUIREMENTS:
${classConfigs.map(config =>
  `Class: ${config.class}${config.division}
  Class Teacher: ${teachers.find(t => t.id === config.classTeacherId)?.name || 'Not assigned'}
  Weekday Periods: ${config.weekdayPeriods}
  Saturday Periods: ${config.saturdayPeriods}
  Include Saturday: ${config.includeSaturday}
  
  Subject Assignments:
  ${config.subjectAssignments.map(assignment => 
    `  - ${assignment.subject}: ${assignment.periodsPerWeek} periods/week (${assignment.isMainSubject ? 'Main' : 'Extra'} subject) - Teacher: ${teachers.find(t => t.id === assignment.teacherId)?.name}`
  ).join('\n')}`
).join('\n\n')}

CONSTRAINTS:
1. No teacher can teach multiple classes at the same time
2. No class can have multiple subjects at the same time
3. Each subject should appear only once per day per class
4. Distribute subjects evenly across days and time slots
5. Avoid repetitive patterns (same subject at same time across days)
6. Class teachers should teach their primary subjects in early periods when possible
7. Activity subjects (PE, Computer, SST) should be distributed in later periods
8. Core subjects (Maths, Science, English) should be in early to mid periods
9. Teachers should not have more than 2 consecutive periods without a break

DAYS: Monday, Tuesday, Wednesday, Thursday, Friday${classConfigs.some(c => c.includeSaturday) ? ', Saturday' : ''}

Generate a JSON response with this exact structure:
{
  "timetables": {
    "Class1A": {
      "Monday": [
        {"subject": "Maths", "teacher": "Teacher Name", "teacherId": "teacher_id"} or null
      ]
    }
  },
  "teacherSchedules": {
    "teacher_id": {
      "Monday": [
        {"class": "Class1A", "subject": "Maths"} or null
      ]
    }
  },
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}

Focus on creating a varied, well-distributed timetable that avoids repetitive patterns and optimizes for educational effectiveness.
`;

    console.log('Sending request to Gemini API...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received response from Gemini API');

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const timetableData = JSON.parse(jsonMatch[0]);
    console.log('Successfully parsed timetable data');

    return new Response(JSON.stringify(timetableData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-timetable-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate timetable using Gemini AI'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
