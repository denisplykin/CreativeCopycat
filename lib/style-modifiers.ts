/**
 * Style modifiers for generating creative variations
 * Based on the analysis of competitor creatives
 */

export interface StyleVariant {
  id: string;
  name: string;
  emoji: string;
  characterModifier: string;
  backgroundModifier: string;
  description: string;
}

/**
 * Available style variations for creative generation
 */
export const STYLE_VARIANTS: StyleVariant[] = [
  {
    id: 'anime',
    name: 'Anime Style',
    emoji: '🎌',
    characterModifier: `
anime style character,
large expressive eyes with detailed highlights,
clean linework and cel shading,
vibrant colors with smooth gradients,
Japanese animation aesthetic,
high quality digital art,
studio quality anime illustration,
professional character design
    `.trim(),
    backgroundModifier: `
keep the same background style as original,
maintain composition and colors,
anime aesthetic treatment
    `.trim(),
    description: 'Japanese anime aesthetic with large expressive eyes and vibrant colors'
  },
  {
    id: 'asian_aesthetic',
    name: 'Asian Aesthetic',
    emoji: '🌸',
    characterModifier: `
young Asian person,
natural beauty with soft features,
professional photography style,
natural lighting and soft focus,
peaceful and serene expression,
modern Asian beauty standards,
high quality portrait photography
    `.trim(),
    backgroundModifier: `
cherry blossom branches with pink sakura flowers,
koi fish swimming gracefully,
soft pastel colors (pink, cyan, blue),
Japanese zen aesthetic,
peaceful and dreamy atmosphere,
floating petals,
bokeh effect background,
natural outdoor lighting
    `.trim(),
    description: 'Peaceful Asian aesthetic with cherry blossoms and koi fish'
  },
  {
    id: 'western',
    name: 'Western Style',
    emoji: '🎬',
    characterModifier: `
Hollywood style portrait,
professional makeup and styling,
studio lighting with dramatic shadows,
glamorous and polished look,
confident and charismatic expression,
commercial advertising photography,
high production value,
cinematic quality portrait
    `.trim(),
    backgroundModifier: `
professional studio background,
dramatic lighting setup,
modern gradient or solid color,
commercial advertising aesthetic,
clean and polished look,
high-end production quality
    `.trim(),
    description: 'Hollywood-style glamorous portrait with professional studio lighting'
  },
  {
    id: '3d_render',
    name: '3D Render',
    emoji: '🎮',
    characterModifier: `
3D rendered character,
Pixar or Disney animation style,
smooth surfaces with subtle textures,
professional 3D character design,
appealing and friendly proportions,
high quality 3D animation aesthetic,
stylized realism,
polished render with proper lighting
    `.trim(),
    backgroundModifier: `
3D rendered environment,
stylized and colorful scene,
professional 3D lighting setup,
animated movie quality background,
vibrant and engaging atmosphere,
clean and polished 3D aesthetic
    `.trim(),
    description: '3D animated character like Pixar/Disney with smooth surfaces'
  },
  {
    id: 'realistic',
    name: 'Realistic Photo',
    emoji: '📸',
    characterModifier: `
photorealistic portrait,
natural skin texture and details,
professional photography,
natural lighting (golden hour or studio),
genuine emotional expression,
DSLR camera quality,
shallow depth of field,
high resolution and sharp focus
    `.trim(),
    backgroundModifier: `
photorealistic environment,
natural outdoor scene or professional studio,
realistic lighting and atmosphere,
authentic colors and textures,
professional photography quality,
suitable for advertising creative
    `.trim(),
    description: 'Ultra-realistic photographic style with natural lighting'
  }
];

/**
 * Apply style modifier to a base character prompt
 */
export function applyStyleToCharacterPrompt(
  basePrompt: string,
  styleId: string
): string {
  const style = STYLE_VARIANTS.find(s => s.id === styleId);
  if (!style) {
    console.warn(`⚠️ Style not found: ${styleId}, using base prompt`);
    return basePrompt;
  }

  // Extract key elements from base prompt (emotion, pose, clothing, action)
  const baseElements = extractKeyElements(basePrompt);

  // Combine base elements with style modifier
  const styledPrompt = `
${style.characterModifier},
${baseElements.emotion ? `emotion: ${baseElements.emotion},` : ''}
${baseElements.pose ? `pose: ${baseElements.pose},` : ''}
${baseElements.clothing ? `clothing: ${baseElements.clothing},` : ''}
${baseElements.action ? `action: ${baseElements.action},` : ''}
maintaining the same overall composition and framing
  `.trim();

  console.log(`🎨 Applied ${style.name} to character prompt`);
  return styledPrompt;
}

/**
 * Apply style modifier to a background prompt
 */
export function applyStyleToBackgroundPrompt(
  basePrompt: string,
  styleId: string
): string {
  const style = STYLE_VARIANTS.find(s => s.id === styleId);
  if (!style) {
    console.warn(`⚠️ Style not found: ${styleId}, using base prompt`);
    return basePrompt;
  }

  // For anime style, keep original background
  if (styleId === 'anime') {
    return `${basePrompt}, ${style.backgroundModifier}`;
  }

  // For other styles, use the style-specific background
  console.log(`🌈 Applied ${style.name} to background prompt`);
  return style.backgroundModifier;
}

/**
 * Extract key elements from a prompt
 */
function extractKeyElements(prompt: string): {
  emotion?: string;
  pose?: string;
  clothing?: string;
  action?: string;
} {
  const lowerPrompt = prompt.toLowerCase();
  const elements: any = {};

  // Extract emotion
  const emotions = ['happy', 'sad', 'surprised', 'excited', 'calm', 'serious', 'thinking', 'smiling', 'confident'];
  for (const emotion of emotions) {
    if (lowerPrompt.includes(emotion)) {
      elements.emotion = emotion;
      break;
    }
  }

  // Extract pose
  const poses = ['standing', 'sitting', 'pointing', 'facing camera', 'arms crossed', 'hands on hips'];
  for (const pose of poses) {
    if (lowerPrompt.includes(pose)) {
      elements.pose = pose;
      break;
    }
  }

  // Extract clothing (simplified)
  if (lowerPrompt.includes('shirt')) elements.clothing = 'shirt';
  if (lowerPrompt.includes('jacket')) elements.clothing = 'jacket';
  if (lowerPrompt.includes('dress')) elements.clothing = 'dress';

  // Extract action
  const actions = ['pointing', 'looking', 'holding', 'gesturing', 'waving'];
  for (const action of actions) {
    if (lowerPrompt.includes(action)) {
      elements.action = action;
      break;
    }
  }

  return elements;
}

/**
 * Generate prompts for all style variants
 */
export function generateAllStyleVariants(
  baseCharacterPrompt: string,
  baseBackgroundPrompt: string
): Array<{
  styleId: string;
  styleName: string;
  characterPrompt: string;
  backgroundPrompt: string;
}> {
  return STYLE_VARIANTS.map(style => ({
    styleId: style.id,
    styleName: style.name,
    characterPrompt: applyStyleToCharacterPrompt(baseCharacterPrompt, style.id),
    backgroundPrompt: applyStyleToBackgroundPrompt(baseBackgroundPrompt, style.id),
  }));
}

