# Nano Banana Pro Integration

## Overview

CreativeCopycat now supports **Nano Banana Pro (Gemini 3 Pro Image Preview)** as an alternative image generation model. This is Google's most advanced image-generation and editing model, built on Gemini 3 Pro.

## Model Information

- **Model ID**: `google/gemini-3-pro-image-preview`
- **Provider**: OpenRouter (routes to Google AI Studio or Google Vertex)
- **Context**: 65,536 tokens
- **Pricing**:
  - Input: $2/M tokens
  - Output: $12/M tokens

## Key Features

- **Advanced multimodal reasoning** - Better understanding of complex image compositions
- **Real-world grounding** - Can incorporate real-time information via Search grounding
- **Industry-leading text rendering** - Including long passages and multilingual layouts
- **Consistent multi-image blending** - Accurate identity preservation across subjects
- **Fine-grained creative controls** - Localized edits, lighting and focus adjustments
- **Flexible outputs** - Support for 2K/4K outputs and flexible aspect ratios

## How to Use

### API Request

To use Nano Banana Pro for creative generation, include the `imageModel` parameter in your generation request:

```json
{
  "creativeId": "your-creative-id",
  "generationType": "full_creative",
  "imageModel": "nano-banana-pro",
  "copyMode": "mask_edit",
  "aspectRatio": "original",
  "texts": {
    "headline": "Your headline text",
    "body": "Your body text"
  }
}
```

### Available Image Models

- `dall-e-2` (default) - OpenAI's DALL-E 2 with mask-based editing
- `dall-e-3` - OpenAI's DALL-E 3 for full regeneration
- `nano-banana-pro` - Google's Nano Banana Pro via OpenRouter

### Example Usage

#### cURL

```bash
curl -X POST https://your-app.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "creativeId": "123e4567-e89b-12d3-a456-426614174000",
    "generationType": "full_creative",
    "imageModel": "nano-banana-pro",
    "copyMode": "slightly_different",
    "aspectRatio": "9:16"
  }'
```

#### TypeScript/JavaScript

```typescript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creativeId: 'your-creative-id',
    generationType: 'full_creative',
    imageModel: 'nano-banana-pro',
    copyMode: 'mask_edit',
    aspectRatio: 'original',
    texts: {
      headline: 'Your headline',
      body: 'Your body text',
      cta: 'Call to action'
    }
  })
});

const result = await response.json();
console.log('Generated URL:', result.generated_url);
```

## When to Use Nano Banana Pro

### Best Use Cases

1. **Complex text rendering** - When you need accurate text placement and multilingual support
2. **High-fidelity visuals** - For professional-grade design and product visualization
3. **Consistent branding** - Better identity preservation across multiple subjects
4. **Creative variations** - Fine-grained control over design elements

### Comparison with DALL-E

| Feature | DALL-E 2 | DALL-E 3 | Nano Banana Pro |
|---------|----------|----------|-----------------|
| **Editing Type** | Mask-based editing | Full regeneration | Full regeneration |
| **Text Rendering** | Limited | Good | Industry-leading |
| **Creative Control** | High (via masks) | Medium | High |
| **Speed** | Fast | Medium | Medium |
| **Cost** | Lower | Medium | Variable* |
| **Best For** | Precise edits | Quick variations | Complex designs |

*Cost varies based on OpenRouter routing

## Technical Implementation

### Pipeline Overview

When you select Nano Banana Pro, the system follows this pipeline:

1. **Analysis Step** - Claude 3.5 Sonnet analyzes the original image via OpenRouter
2. **Prompt Generation** - Creates a detailed prompt for Nano Banana Pro
3. **Image Generation** - Nano Banana Pro generates the new creative
4. **Post-processing** - Convert base64 output to Buffer for upload

### Code Integration

The Nano Banana Pro integration is implemented in `/lib/nano-banana.ts`:

```typescript
import { generateWithNanaBanana } from '@/lib/nano-banana';

const buffer = await generateWithNanaBanana({
  imageBuffer: originalImageBuffer,
  modifications: 'Your modification instructions',
  aspectRatio: 'original',
  analysis: existingAnalysisData
});
```

## Configuration

### Environment Variables

Make sure you have the following environment variable set:

```env
# Required for Nano Banana Pro
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

The same API key is used for:
- Text generation (Claude, GPT models)
- OCR (Gemini 2.5 Flash)
- Image generation (Nano Banana Pro)

### Model Selection

The image model is selected per request, not globally configured. This allows you to:
- A/B test different models
- Choose the best model for each use case
- Fall back to different models if one fails

## Troubleshooting

### Common Issues

1. **"OPENROUTER_API_KEY is not configured"**
   - Make sure your `.env.local` file has `OPENROUTER_API_KEY` set
   - Restart your development server after adding the key

2. **"No images returned from Nano Banana Pro"**
   - Check that the OpenRouter API key has access to image generation models
   - Verify the model ID is correct: `google/gemini-3-pro-image-preview`

3. **"Invalid data URL format"**
   - The API should return base64-encoded data URLs
   - Check the response format from OpenRouter

### Debug Logging

The system logs each step of the pipeline:

```
🍌 NANO BANANA PRO PIPELINE: Starting...
📐 Aspect ratio: original
📝 Modifications: Update logo to Algonova...

👁️ STEP 1: Analyzing image and generating prompt...
✅ STEP 1 COMPLETE! Generated prompt:
Professional advertising banner with...

🍌 STEP 2: Generating image with Nano Banana Pro...
✅ STEP 2 COMPLETE! Image generated
✅ Generated: 1234567 bytes
🎉 Nano Banana Pro pipeline successful!
```

## API Reference

### Types

```typescript
export type ImageGenerationModel = 'dall-e-2' | 'dall-e-3' | 'nano-banana-pro';

export interface GenerateRequest {
  creativeId: string;
  generationType: GenerationType;
  imageModel?: ImageGenerationModel; // Defaults to 'dall-e-2'
  // ... other fields
}
```

### Functions

#### `generateImageWithNanaBanana(options)`

Direct image generation from a text prompt.

```typescript
interface NanoBananaOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}
```

#### `generateWithNanaBanana(params)`

Full pipeline: analyze existing image + generate new version.

```typescript
interface GenerateWithNanaBananaParams {
  imageBuffer: Buffer;
  modifications: string;
  aspectRatio?: string;
  analysis?: any;
}
```

## Performance Considerations

- **Latency**: Nano Banana Pro has average latency of 7-11 seconds
- **Throughput**: 40-80 tokens/second depending on provider
- **Uptime**: 79-87% across Google Vertex and Google AI Studio
- **Fallbacks**: OpenRouter automatically routes to the best available provider

## Resources

- [OpenRouter Model Page](https://openrouter.ai/models/google/gemini-3-pro-image-preview)
- [Nano Banana Pro Documentation](https://openrouter.ai/docs/models/gemini-3-pro-image)
- [OpenRouter API Reference](https://openrouter.ai/docs/api-reference)

## Support

For issues with:
- **CreativeCopycat integration**: Open an issue in your repository
- **OpenRouter API**: Visit [OpenRouter Discord](https://discord.gg/openrouter)
- **Nano Banana Pro model**: Check [Google AI Studio documentation](https://ai.google.dev/)
