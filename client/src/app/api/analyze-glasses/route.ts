import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openrouter/free';

const SYSTEM_PROMPT = `You are an expert optical stylist and senior e-commerce copywriter for Nyvara, a premium Tunisian eyewear brand. Analyze the provided glasses frame image and return STRICT valid JSON — no Markdown fences, no extra keys, no commentary outside the JSON object.

Required schema (return ALL fields):
{
  "name_suggestions": [
    "Nom réel axé sur la forme (ex: Papillon Écaille)",
    "Nom créatif style marque (ex: Vintage Square)",
    "Nom modèle élégant (ex: L'Iconique Ambrée)"
  ],
  "price_original": 89.900,
  "price_discounted": 69.900,
  "cost_price": 25.000,
  "stock_initial": 15,
  "gender": "unisex" | "homme" | "femme",
  "promo_badge": "🔥 Offre Spéciale" | "#1 Meilleure Vente" | "Nouveauté",
  "rating_score": 4.8,
  "rating_count": 42,
  "highlights_bullets": "Protection UV400 intégrale\\nVerres teintés haute clarté\\nMonture acétate durable et légère\\nFinition premium avec charnières renforcées",
  "short_description": "2 phrases d'accroche captivantes.",
  "full_description": "2 paragraphes marketing détaillant le style, le confort et les finitions.",
  "color_analysis": {
    "variant_name": "Nom de variante précis (ex: Noir & Verres Bleu Ciel)",
    "primary_hex": "#000000",
    "secondary_hex": "#70C1E8 (ou null si la monture et les verres sont unis)"
  },
  "technical_specs": [
    { "key": "Forme", "value": "Ronde | Carrée | Papillon | Aviateur | etc." },
    { "key": "Structure", "value": "Monture complète | Demi-cerclée | Percée" },
    { "key": "Matériau", "value": "Acétate | Métal | Plastique | Métal & Acétate" },
    { "key": "Coloris", "value": "Description précise de la couleur et des verres" },
    { "key": "Taille", "value": "Moyenne / Standard | Petite | Large" },
    { "key": "Visages recommandés", "value": "Formes de visages idéales en français" }
  ],
  "frame_shape": "MUST BE ONE OF: Rond Classique | Aviateur | Œil-de-chat | Carrée | Rectangulaire | Géométrique",
  "style_vibe": "MUST BE ONE OF: Rétro | Minimaliste | Audacieux | Chic | Sport",
  "optical_fit": "MUST BE ONE OF: Petit / Étroit | Moyen / Standard | Large",
  "ideal_faces": ["Rond", "Oval", "Carré", "Cœur"] // Can contain multiple
}

Rules:
- name_suggestions: EXACTLY 3 distinct titles based on visible traits: 1 market classic (e.g. "Papillon Écaille Rosé"), 1 trendy brand style (e.g. "Sunset Tortoise"), 1 luxury model code (e.g. "L'Iconique Ambrée"). All IN FRENCH.
- price_original: realistic TND price (e.g. 89.900). price_discounted must be lower. cost_price = roughly 25–35% of price_original.
- stock_initial: realistic integer between 10 and 30.
- gender: "unisex", "homme", or "femme".
- promo_badge: a SHORT promotional badge string max 30 chars IN FRENCH.
- rating_score: a float between 4.2 and 4.9. rating_count: integer between 20 and 200.
- highlights_bullets: 4 bullet lines IN FRENCH separated by \\n.
- short_description and full_description MUST be in French.
- technical_specs: return as an array of { key, value } objects with EXACTLY 6 entries. Keys and Values MUST be in French.
- Output ONLY the JSON object. No prefix, no suffix.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'OpenRouter API key is missing' }, { status: 500 });
  }

  let imageBase64: string;
  try {
    const body = await req.json();
    imageBase64 = body?.imageBase64;
  } catch (err: unknown) {
    console.error('[analyze-glasses] JSON parse error:', err);
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!imageBase64) {
    return NextResponse.json({ success: false, error: 'No imageBase64 provided.' }, { status: 400 });
  }

  try {
    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://nyvara.tn',
        'X-Title': 'Nyvara Admin Panel',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [{ type: 'text', text: SYSTEM_PROMPT }]
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          },
        ],
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error('[analyze-glasses] OpenRouter error:', orRes.status, errText);
      return NextResponse.json(
        { success: false, error: `OpenRouter returned ${orRes.status}: ${errText.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const orData = await orRes.json();
    const rawContent: string = orData?.choices?.[0]?.message?.content ?? '';

    // Extract JSON using regex to handle potential markdown formatting
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : rawContent;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('[analyze-glasses] JSON parse error:', parseErr, '\nRaw:', rawContent.slice(0, 500));
      return NextResponse.json(
        { success: false, error: 'AI returned malformed JSON. Try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-glasses] Unexpected error:', message);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}
