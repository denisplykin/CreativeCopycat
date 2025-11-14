import axios from 'axios';
import type { TextRole, RolesJSON, TextsJSON } from '@/types/creative';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Call OpenRouter API with specified model
 */
async function callOpenRouter(
  prompt: string,
  model: string = 'anthropic/claude-3.5-sonnet',
  temperature: number = 0.7
): Promise<string> {
  try {
    const response = await axios.post(
      OPENROUTER_BASE_URL,
      {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://creative-copycat.vercel.app',
          'X-Title': 'Creative Copycat',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw new Error('Failed to call OpenRouter API');
  }
}

/**
 * Extract text roles from OCR result
 */
export async function extractRoles(
  text: string,
  model?: string,
  temperature?: number
): Promise<RolesJSON> {
  const prompt = `Analyze this advertising creative text and identify the role of each text segment.

Text:
${text}

Identify and classify each segment as one of these roles:
- hook: Attention-grabbing headline
- twist: Surprising element or unique selling point
- cta: Call to action
- body: Main descriptive text
- headline: Primary title
- subheadline: Secondary title

Return a JSON array with this structure:
{
  "roles": [
    { "role": "hook", "text": "extracted text" },
    { "role": "cta", "text": "extracted text" }
  ]
}

Only return valid JSON, no additional text.`;

  const response = await callOpenRouter(prompt, model, temperature);

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as RolesJSON;
  } catch (error) {
    console.error('Failed to parse roles JSON:', error);
    // Return stub data if parsing fails
    return {
      roles: [
        { role: 'hook', text: 'AMAZING OFFER' },
        { role: 'twist', text: 'Get 50% OFF' },
        { role: 'body', text: 'Limited time only! Click here to claim your discount now.' },
        { role: 'cta', text: 'SHOP NOW' },
      ],
    };
  }
}

/**
 * Generate new texts based on roles and parameters
 */
export async function generateTexts(
  roles: TextRole[],
  niche?: string,
  language: string = 'en',
  model?: string,
  temperature?: number
): Promise<TextsJSON> {
  const rolesDescription = roles
    .map((r) => `- ${r.role}: "${r.text}" (approx ${r.text.length} chars)`)
    .join('\n');

  const nicheContext = niche ? `\nNiche/Product: ${niche}` : '';
  const languageContext = language !== 'en' ? `\nLanguage: ${language}` : '';

  const prompt = `Generate new advertising copy for a creative with the following structure:

${rolesDescription}${nicheContext}${languageContext}

Requirements:
- Maintain similar length for each text segment
- Keep the same role structure
- Create compelling, attention-grabbing copy
- Make it suitable for the specified niche${language !== 'en' ? ` and in ${language}` : ''}

Return a JSON object with keys matching the roles:
{
  "texts": {
    "hook": "new hook text",
    "twist": "new twist text",
    "body": "new body text",
    "cta": "new cta text"
  }
}

Only return valid JSON, no additional text.`;

  const response = await callOpenRouter(prompt, model, temperature);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as TextsJSON;
  } catch (error) {
    console.error('Failed to parse texts JSON:', error);
    // Return stub data if parsing fails
    const texts: Record<string, string> = {};
    roles.forEach((r) => {
      texts[r.role] = `Generated ${r.role} text`;
    });
    return { texts };
  }
}

/**
 * Generate prompt for DALL·E based on style and context
 */
export function generateImagePrompt(
  stylePreset: string,
  niche?: string,
  layoutHints?: string
): string {
  const styleDescriptions: Record<string, string> = {
    anime: 'anime style, vibrant colors, expressive character',
    sakura: 'Japanese sakura cherry blossom theme, soft pink and white, elegant',
    realistic: 'photorealistic, high quality, professional photography',
    '3d': '3D render, modern, clean, high quality CGI',
    minimal: 'minimalist design, clean, simple, modern aesthetic',
    original: 'creative advertising style, eye-catching, professional',
  };

  const styleDesc = styleDescriptions[stylePreset] || styleDescriptions.original;
  const nicheDesc = niche ? `, ${niche} related` : '';
  const layoutDesc = layoutHints ? `, ${layoutHints}` : ', with empty space for text overlay';

  return `${styleDesc}${nicheDesc}${layoutDesc}, no text in image, advertising background`;
}

