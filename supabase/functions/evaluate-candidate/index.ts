const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugLog {
  timestamp: string;
  action: string;
  details: any;
  status?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const debugLogs: DebugLog[] = [];
  
  try {
    const { jobDescription, resume } = await req.json();
    debugLogs.push({
      timestamp: new Date().toISOString(),
      action: 'Request Received',
      details: {
        jobDescriptionLength: jobDescription?.length,
        resumeLength: resume?.length,
      },
      status: 'success'
    });

    console.log('Evaluating candidate via CrewAI - Job description length:', jobDescription?.length, 'Resume length:', resume?.length);

    if (!jobDescription || !resume) {
      debugLogs.push({
        timestamp: new Date().toISOString(),
        action: 'Validation Failed',
        details: { error: 'Missing required fields' },
        status: 'error'
      });
      return new Response(
        JSON.stringify({ error: 'Both job description and resume are required', debugLogs }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CREWAI_BASE_URL = Deno.env.get('CREWAI_BASE_URL');
    const CREWAI_BEARER_TOKEN = Deno.env.get('CREWAI_BEARER_TOKEN');

    if (!CREWAI_BASE_URL || !CREWAI_BEARER_TOKEN) {
      console.error('CrewAI credentials not configured');
      debugLogs.push({
        timestamp: new Date().toISOString(),
        action: 'Configuration Error',
        details: { error: 'CrewAI credentials not configured' },
        status: 'error'
      });
      return new Response(
        JSON.stringify({ error: 'CrewAI service is not configured', debugLogs }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Kickoff the CrewAI evaluation
    debugLogs.push({
      timestamp: new Date().toISOString(),
      action: 'Kickoff Request to CrewAI',
      details: {
        url: `${CREWAI_BASE_URL}/kickoff`,
        payload: { jobDescription, resume }
      },
      status: 'pending'
    });

    const kickoffResponse = await fetch(`${CREWAI_BASE_URL}/kickoff`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CREWAI_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          jobDescription,
          resume
        }
      }),
    });

    if (!kickoffResponse.ok) {
      const errorText = await kickoffResponse.text();
      console.error('CrewAI kickoff error:', kickoffResponse.status, errorText);
      debugLogs.push({
        timestamp: new Date().toISOString(),
        action: 'Kickoff Failed',
        details: {
          status: kickoffResponse.status,
          error: errorText
        },
        status: 'error'
      });
      
      return new Response(
        JSON.stringify({ error: 'Failed to initiate evaluation', debugLogs }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const kickoffData = await kickoffResponse.json();
    const kickoffId = kickoffData.kickoff_id;

    debugLogs.push({
      timestamp: new Date().toISOString(),
      action: 'Kickoff Response Received',
      details: {
        kickoff_id: kickoffId,
        response: kickoffData
      },
      status: 'success'
    });

    console.log('CrewAI kickoff successful, ID:', kickoffId);

    // Step 2: Poll for status until completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let evaluation;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls
      attempts++;

      debugLogs.push({
        timestamp: new Date().toISOString(),
        action: `Status Check (Attempt ${attempts})`,
        details: {
          url: `${CREWAI_BASE_URL}/status/${kickoffId}`,
          kickoff_id: kickoffId
        },
        status: 'pending'
      });

      const statusResponse = await fetch(`${CREWAI_BASE_URL}/status/${kickoffId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CREWAI_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('CrewAI status check error:', statusResponse.status, errorText);
        debugLogs.push({
          timestamp: new Date().toISOString(),
          action: 'Status Check Failed',
          details: {
            status: statusResponse.status,
            error: errorText
          },
          status: 'error'
        });
        continue;
      }

      const statusData = await statusResponse.json();
      
      debugLogs.push({
        timestamp: new Date().toISOString(),
        action: 'Status Response Received',
        details: {
          status: statusData.status,
          response: statusData
        },
        status: statusData.status === 'COMPLETE' ? 'success' : 'pending'
      });

      console.log('CrewAI status:', statusData.status);

      if (statusData.status === 'COMPLETE') {
        evaluation = statusData.result || statusData.output;
        debugLogs.push({
          timestamp: new Date().toISOString(),
          action: 'Evaluation Complete',
          details: { evaluation },
          status: 'success'
        });
        break;
      } else if (statusData.status === 'ERROR' || statusData.status === 'FAILED') {
        debugLogs.push({
          timestamp: new Date().toISOString(),
          action: 'Evaluation Failed',
          details: { error: statusData.error || 'Unknown error' },
          status: 'error'
        });
        throw new Error(statusData.error || 'CrewAI evaluation failed');
      }
    }

    if (!evaluation) {
      debugLogs.push({
        timestamp: new Date().toISOString(),
        action: 'Timeout',
        details: { error: 'Evaluation timed out after maximum attempts' },
        status: 'error'
      });
      return new Response(
        JSON.stringify({ error: 'Evaluation timed out. Please try again.', debugLogs }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully received evaluation from CrewAI:', evaluation);

    // Parse and validate the evaluation result
    let parsedEvaluation;
    if (typeof evaluation === 'string') {
      try {
        parsedEvaluation = JSON.parse(evaluation);
      } catch {
        parsedEvaluation = evaluation;
      }
    } else {
      parsedEvaluation = evaluation;
    }

    debugLogs.push({
      timestamp: new Date().toISOString(),
      action: 'Final Response',
      details: { evaluation: parsedEvaluation },
      status: 'success'
    });

    return new Response(
      JSON.stringify({
        ...parsedEvaluation,
        debugLogs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-candidate:', error);
    debugLogs.push({
      timestamp: new Date().toISOString(),
      action: 'Fatal Error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      status: 'error'
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        debugLogs 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
