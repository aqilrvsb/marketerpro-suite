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

    // Try different waybill endpoints
    // Option 1: Reports waybill endpoint (v2.0)
    let waybillUrl = `https://api.ninjavan.co/my/2.0/reports/waybill?tids=${tids}&h=0`;
    console.log('Attempting waybill fetch from:', waybillUrl);

    let waybillResponse = await fetch(waybillUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // If v2.0 fails, try v4.1 endpoint
    if (!waybillResponse.ok) {
      const errorText1 = await waybillResponse.text();
      console.log('V2.0 endpoint failed:', errorText1);

      // Option 2: Try v4.1 waybill endpoint
      waybillUrl = `https://api.ninjavan.co/my/4.1/orders/waybill?tids=${tids}`;
      console.log('Trying v4.1 endpoint:', waybillUrl);

      waybillResponse = await fetch(waybillUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }

    // If still fails, try individual order waybill
    if (!waybillResponse.ok) {
      const errorText2 = await waybillResponse.text();
      console.log('V4.1 endpoint failed:', errorText2);

      // Option 3: Try getting waybill for first tracking number only
      const firstTid = trackingNumbers[0];
      waybillUrl = `https://api.ninjavan.co/my/4.1/orders/${firstTid}/waybill`;
      console.log('Trying individual order endpoint:', waybillUrl);

      waybillResponse = await fetch(waybillUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }

    if (!waybillResponse.ok) {
      const errorText = await waybillResponse.text();
      console.error('All waybill endpoints failed:', errorText);

      // Return helpful error message
      return new Response(
        JSON.stringify({
          error: 'Waybill access denied. Your Ninjavan API credentials may not have waybill permissions.',
          details: errorText,
          suggestion: 'Please contact Ninjavan to enable waybill/AWB scope (CORE_GET_AWB) for your API credentials.'
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
