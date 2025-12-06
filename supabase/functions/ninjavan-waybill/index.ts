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

    // Check for valid token or get new one
    let accessToken: string;
    const now = new Date();

    const { data: tokenData } = await supabase
      .from('ninjavan_tokens')
      .select('*')
      .gt('expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenData && tokenData.access_token) {
      accessToken = tokenData.access_token;
      console.log('Using existing valid token');
    } else {
      // Get new token
      console.log('Requesting new token from Ninjavan');

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
          JSON.stringify({ error: 'Failed to authenticate with Ninjavan API' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authData = await authResponse.json();
      accessToken = authData.access_token;
      const expiresIn = authData.expires_in || 3600;
      const expiresAt = new Date(now.getTime() + ((expiresIn - 300) * 1000));

      // Store new token
      await supabase.from('ninjavan_tokens').insert({
        access_token: accessToken,
        expires_at: expiresAt.toISOString()
      });
    }

    // Join tracking numbers with comma for Ninjavan API
    const tids = trackingNumbers.join(',');
    const waybillUrl = `https://api.ninjavan.co/my/2.0/reports/waybill?tids=${tids}&h=0`;

    console.log('Fetching waybill from:', waybillUrl);

    // Fetch waybill PDF from Ninjavan
    const waybillResponse = await fetch(waybillUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!waybillResponse.ok) {
      const errorText = await waybillResponse.text();
      console.error('Waybill fetch failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch waybill from Ninjavan', details: errorText }),
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
