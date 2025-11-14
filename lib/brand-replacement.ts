/**
 * Replace competitor brand names with Algonova
 * Remove competitor logos from creatives
 */

// Known competitor brands in Indonesian EdTech market
const COMPETITOR_BRANDS = [
  'kodland',
  'timedoor',
  'dicoding',
  'ruangguru',
  'zenius',
  'quipper',
  'skill academy',
  'skillacademy',
  'cakap',
  'algoritma',
  'hacktiv8',
  'binar academy',
  'purwadhika',
  'revou',
  'course-net',
  'coursenet',
  'great nusa',
  'greatnusa',
];

/**
 * Replace all competitor brand names with Algonova in text
 */
export function replaceBrandWithAlgonova(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Replace each competitor brand (case-insensitive)
  for (const brand of COMPETITOR_BRANDS) {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    result = result.replace(regex, 'Algonova');
  }
  
  return result;
}

/**
 * Replace brand names in generated texts object
 */
export function replaceBrandsInTexts(texts: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(texts)) {
    result[key] = replaceBrandWithAlgonova(value);
  }
  
  return result;
}

/**
 * Check if logo should be removed based on analysis
 * Returns true if logo is present and belongs to competitor
 */
export function shouldRemoveLogo(analysis: any): boolean {
  // Check Claude-style analysis
  if (analysis?.logo?.present) {
    return true; // Remove all competitor logos
  }
  
  // Check design analysis for logo graphics
  if (analysis?.design?.graphics) {
    const hasLogo = analysis.design.graphics.some(
      (g: any) => g.type === 'logo'
    );
    return hasLogo;
  }
  
  return false;
}

/**
 * Get logo bounding boxes to add to mask
 * Returns array of boxes to be masked out (removed)
 */
export function getLogoBoundingBoxes(analysis: any, imageWidth: number, imageHeight: number): Array<{x: number, y: number, width: number, height: number}> {
  const boxes: Array<{x: number, y: number, width: number, height: number}> = [];
  
  // Extract logo positions from design analysis
  if (analysis?.design?.graphics) {
    const logos = analysis.design.graphics.filter((g: any) => g.type === 'logo');
    
    for (const logo of logos) {
      if (logo.position) {
        boxes.push(logo.position);
      }
    }
  }
  
  // If no precise position, use typical logo positions (top corners)
  if (boxes.length === 0 && shouldRemoveLogo(analysis)) {
    // Default: remove top-left area (typical logo position)
    boxes.push({
      x: 0,
      y: 0,
      width: Math.floor(imageWidth * 0.25), // 25% width
      height: Math.floor(imageHeight * 0.15), // 15% height
    });
  }
  
  return boxes;
}
