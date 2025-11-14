import type { BoundingBox } from '@/types/creative';

/**
 * Full creative analysis using Claude 3.5 Sonnet (Old Style approach)
 * Based on proven method from Competitors-scrapper project
 * More detailed than Gemini: includes people, emotions, target audience, design principles
 */
export async function analyzeCreativeWithClaude(imageBuffer: Buffer): Promise<any> {
  try {
    console.log('🔍 Starting Claude 3.5 Sonnet analysis (Old Style)...');

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // Call Claude 3.5 Sonnet through OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Creative Copycat AI',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.3, // Low for accuracy
        max_tokens: 4000, // High for detailed response
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              },
              {
                type: 'text',
                text: CLAUDE_ANALYSIS_PROMPT
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('⚠️ No content from Claude');
      throw new Error('No content from Claude');
    }

    console.log('📝 Claude response received');

    // Parse JSON from Claude's response
    let jsonText = content;
    
    // Try multiple parsing strategies
    if (content.includes('```json')) {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    } else if (content.includes('```')) {
      const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    const analysis = JSON.parse(jsonText);

    console.log('✅ Claude analysis complete!');
    console.log(`   - Headline: ${analysis.headline || 'N/A'}`);
    console.log(`   - CTA: ${analysis.cta || 'N/A'}`);
    console.log(`   - People present: ${analysis.people?.present || false}`);
    console.log(`   - Style: ${analysis.style || 'N/A'}`);

    return analysis;
  } catch (error) {
    console.error('❌ Claude analysis error:', error);
    throw error;
  }
}

/**
 * Detect MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  return 'image/png';
}

/**
 * Full Claude analysis prompt (83 lines from old project)
 * This is the proven approach from Competitors-scrapper
 */
const CLAUDE_ANALYSIS_PROMPT = `Analyze this advertising creative in extreme detail and return a JSON object with the following structure:

{
  "headline": "Main headline text (if present)",
  "offer": "Offer/discount/benefit mentioned",
  "cta": "Call-to-action text",
  "bodyText": "Main body text content",
  "brandName": "Brand name mentioned",
  
  "logo": {
    "present": true/false,
    "position": "top-left/top-right/center/etc",
    "size": "small/medium/large"
  },
  
  "mainObject": "Description of the main subject (person, product, etc)",
  
  "secondaryObjects": ["array", "of", "secondary", "elements"],
  
  "layout": {
    "headlinePosition": "top/middle/bottom",
    "ctaPosition": "top/middle/bottom",
    "logoPosition": "top-left/top-right/etc",
    "textAlignment": "left/center/right",
    "visualHierarchy": "description of how elements are arranged"
  },
  
  "colors": ["#HEX1", "#HEX2", "#HEX3"],
  "dominantColor": "#HEX",
  
  "textBlocks": [
    {"text": "...", "position": "...", "size": "large/medium/small"}
  ],
  
  "backgroundType": "solid/gradient/photo/complex",
  "backgroundDescription": "detailed description",
  
  "borders": true/false,
  "shadows": true/false,
  "gradients": true/false,
  
  "style": "realistic/illustration/3d/collage/minimal/modern",
  "format": "square/vertical/horizontal",
  "aspectRatio": "1:1/9:16/16:9/etc",
  
  "visualFocus": "what draws the eye first",
  
  "people": {
    "present": true/false,
    "count": number,
    "type": "face/full-body/silhouette/hands",
    "age": "child/teen/adult/senior",
    "gender": "male/female/diverse",
    "emotion": "happy/excited/serious/thinking/etc",
    "action": "what they're doing",
    "clothing": "description of clothes/style"
  },
  
  "imageGenerationPrompts": {
    "character": "Detailed Midjourney prompt for generating similar character/person",
    "background": "Detailed Flux prompt for generating similar background"
  },
  
  "designPrinciples": {
    "colorContrast": "high/medium/low",
    "whitespace": "abundant/balanced/minimal",
    "typography": "description of text style",
    "composition": "rule of thirds/centered/asymmetric/etc"
  },
  
  "targetAudience": "inferred target demographic",
  "tone": "professional/playful/urgent/educational/etc",
  
  "keySellingPoints": ["point1", "point2", "point3"],
  
  "notes": "Any additional observations"
}

Be extremely detailed and accurate. Extract ALL text exactly as written. Provide specific color codes, positions, and descriptions. This analysis will be used to generate a similar but unique creative.`;

