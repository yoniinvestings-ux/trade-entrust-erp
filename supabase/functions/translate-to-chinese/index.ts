import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productNames, specifications } = await req.json();
    
    if (!productNames && !specifications) {
      return new Response(
        JSON.stringify({ error: "No content to translate" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a professional translator specializing in product specifications and trade documents. Translate the following product information to Chinese (Simplified). Keep technical terms accurate and use proper business Chinese.

${productNames ? `Product Names (translate each on a new line, maintain order):
${productNames}` : ''}

${specifications ? `Specifications (translate to Chinese, keep measurements and numbers):
${specifications}` : ''}

IMPORTANT:
- Keep model numbers, measurements (mm, cm, kg, PCS, etc.) and numbers as-is
- Use proper Chinese business/trade terminology
- For product names, provide concise Chinese names
- For specifications, translate descriptions but keep technical values intact
- Return ONLY the translations, no explanations

Format your response as JSON:
{
  "productNamesCn": "translated product names (one per line if multiple)",
  "specificationsCn": "translated specifications"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional English to Chinese translator for trade and manufacturing documents. Always respond with valid JSON only."
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI translation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No translation received");
    }

    // Parse the JSON response from the AI
    let translation;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse translation response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback: return the raw content
      translation = {
        productNamesCn: productNames ? content.split('\n')[0] : '',
        specificationsCn: specifications ? content : ''
      };
    }

    return new Response(JSON.stringify(translation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
