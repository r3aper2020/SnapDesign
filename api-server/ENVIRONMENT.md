# Environment Variables

Create a `.env` file in the `api-server` directory with the following variables:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Model Configuration
GEMINI_MODEL=gemini-2.5-flash-image-preview
GEMINI_TEXT_MODEL=gemini-1.5-flash

# Server Configuration
PORT=4000
```

## Model Options

### Image Generation Models:
- `gemini-2.5-flash-image-preview` (default) - Fast image generation
- `gemini-2.0-flash-exp` - Experimental model
- `gemini-1.5-pro` - Higher quality but slower

### Text Analysis Models:
- `gemini-1.5-flash` (default) - Fast text analysis
- `gemini-1.5-pro` - Higher quality analysis
- `gemini-2.0-flash-exp` - Experimental model

## Setup Instructions

1. Copy this file to `.env` in the api-server directory
2. Replace `your_gemini_api_key_here` with your actual Gemini API key
3. Adjust model names as needed for your use case
4. Restart the server after making changes
