import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trackingNumbers } = await req.json();

    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tracking numbers provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching waybills for tracking numbers:', trackingNumbers);

    // Get Ninjavan config
    const { data: config, error: configError } = await supabase
      .from('ninjavan_config')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('Config not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Ninjavan configuration not found.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always get a fresh token for waybill (don't use cached token)
    // Waybill API requires specific scopes that may differ from order creation
    console.log('Requesting fresh token from Ninjavan for waybill access');

    const authResponse = await fetch('https://api.ninjavan.co/my/2.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'client_credentials'
      })
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Ninjavan Auth failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Ninjavan API', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    console.log('Token obtained successfully, scopes:', authData.scope || 'not provided');

    // Join tracking numbers with comma for Ninjavan API
    const tids = trackingNumbers.join(',');
    console.log('Tracking numbers to fetch:', tids);

    // Try the reports/waybill endpoint which is the standard for bulk waybill download
    // Based on PHP example: https://api.ninjavan.co/my/2.0/reports/waybill?tids=$track&h=0
    const waybillUrl = `https://api.ninjavan.co/my/2.0/reports/waybill?tids=${encodeURIComponent(tids)}&h=0`;
    console.log('Fetching waybill from:', waybillUrl);

    const waybillResponse = await fetch(waybillUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('Waybill response status:', waybillResponse.status);
    console.log('Waybill response headers:', JSON.stringify(Object.fromEntries(waybillResponse.headers.entries())));

    if (!waybillResponse.ok) {
      const contentType = waybillResponse.headers.get('content-type') || '';
      let errorDetails: string;

      if (contentType.includes('application/json')) {
        const errorJson = await waybillResponse.json();
        errorDetails = JSON.stringify(errorJson);
      } else {
        errorDetails = await waybillResponse.text();
      }

      console.error('Waybill fetch failed:', errorDetails);

      // Return helpful error message
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch waybill from Ninjavan.',
          status: waybillResponse.status,
          details: errorDetails,
          trackingNumbers: trackingNumbers,
          suggestion: waybillResponse.status === 403
            ? 'Your Ninjavan API credentials may not have waybill permissions. Contact Ninjavan to enable CORE_GET_AWB scope.'
            : 'Please verify the tracking numbers are correct and the orders exist in Ninjavan.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if response is actually PDF
    const responseContentType = waybillResponse.headers.get('content-type') || '';
    if (!responseContentType.includes('application/pdf')) {
      const responseText = await waybillResponse.text();
      console.error('Response is not PDF:', responseContentType, responseText.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: 'Ninjavan did not return a PDF.',
          contentType: responseContentType,
          details: responseText.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PDF as arrayBuffer and convert to base64
    const pdfBuffer = await waybillResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    return new Response(
      JSON.stringify({
        success: true,
        pdf: pdfBase64,
        contentType: 'application/pdf'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    console.error('Error in ninjavan-waybill function:', err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
