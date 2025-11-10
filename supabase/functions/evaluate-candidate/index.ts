const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, resume } = await req.json();
    console.log('Evaluating candidate - Job description length:', jobDescription?.length, 'Resume length:', resume?.length);

    if (!jobDescription || !resume) {
      return new Response(
        JSON.stringify({ error: 'Both job description and resume are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert talent evaluator and HR professional. Analyze candidates based on:

1. SOFT SKILLS (0-100): Communication, leadership, teamwork, problem-solving, adaptability, emotional intelligence
2. HARD SKILLS (0-100): Technical expertise, industry knowledge, certifications, tools proficiency, specific job requirements
3. POTENTIAL (0-100): Growth mindset, learning ability, cultural fit, career trajectory, passion for the field

Provide scores and a detailed 200-300 word summary explaining your assessment.

CRITICAL: You must respond with ONLY valid JSON in this exact format:
{
  "softSkills": <number 0-100>,
  "hardSkills": <number 0-100>,
  "potential": <number 0-100>,
  "summary": "<detailed evaluation text>"
}

Do not include any text before or after the JSON object.`
          },
          {
            role: 'user',
            content: `Evaluate this candidate for the following position:

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resume}

Provide your evaluation as JSON with softSkills, hardSkills, potential (all 0-100), and a summary.`
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add more credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to evaluate candidate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;

    console.log('AI response received, parsing evaluation...');

    // Parse the JSON response from AI
    let evaluation;
    try {
      // Try to extract JSON if there's extra text
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        evaluation = JSON.parse(rawContent);
      }

      // Validate the response structure
      if (
        typeof evaluation.softSkills !== 'number' ||
        typeof evaluation.hardSkills !== 'number' ||
        typeof evaluation.potential !== 'number' ||
        typeof evaluation.summary !== 'string'
      ) {
        throw new Error('Invalid evaluation structure');
      }

      // Ensure scores are within 0-100 range
      evaluation.softSkills = Math.max(0, Math.min(100, Math.round(evaluation.softSkills)));
      evaluation.hardSkills = Math.max(0, Math.min(100, Math.round(evaluation.hardSkills)));
      evaluation.potential = Math.max(0, Math.min(100, Math.round(evaluation.potential)));

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Raw content:', rawContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse evaluation results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully evaluated candidate:', evaluation);

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-candidate:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
