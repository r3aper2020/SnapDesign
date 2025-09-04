# SnapDesign 🎨

A mobile app that transforms your photos into beautifully decorated party spaces using AI, with product suggestions and Amazon affiliate links.

## Features

- **AI Image Transformation**: Upload a photo and transform it into a festive party space
- **Smart Product Detection**: AI analyzes the generated image to identify decorative products
- **Amazon Integration**: Direct links to purchase suggested products with affiliate tracking
- **Cross-Platform**: Built with Expo React Native for iOS and Android
- **Real-time Processing**: Fast AI-powered image generation and analysis

## Tech Stack

### Backend (API Server)
- **Node.js** with **TypeScript**
- **Express.js** for RESTful API
- **Google Gemini AI** for image generation and analysis
- **Amazon Product Advertising API** integration

### Frontend (Mobile App)
- **Expo React Native** with **TypeScript**
- **React Navigation** for app navigation
- **Expo Image Picker** for camera and gallery access
- **Custom UI components** with theming

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Google Gemini API key
- Amazon affiliate tag (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SnapDesign
   ```

2. **Install dependencies**
   ```bash
   # Install API server dependencies
   cd api-server
   npm install
   
   # Install mobile app dependencies
   cd ../app
   npm install
   ```

3. **Environment Setup**
   
   Create `.env` file in `api-server/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash-image-preview
   AMAZON_PARTNER_TAG=your_amazon_affiliate_tag
   AMAZON_HOST=amazon.com
   ```

4. **Start the development environment**
   ```bash
   # From the root directory
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

This will:
- Start the API server on port 4000
- Launch the Expo development server
- Display the QR code for testing on your device

## Project Structure

```
SnapDesign/
├── api-server/           # Backend API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── app.ts       # Express app setup
│   │   └── index.ts     # Server entry point
│   └── package.json
├── app/                  # Expo React Native app
│   ├── src/
│   │   ├── screens/     # App screens
│   │   ├── navigation/  # Navigation setup
│   │   ├── config/      # API configuration
│   │   └── theme/       # UI theming
│   └── package.json
├── scripts/
│   └── dev.sh          # Development startup script
└── README.md
```

## API Endpoints

### POST /design
Transforms an image and returns decorated version with product suggestions.

**Request Body:**
```json
{
  "imageBase64": "base64_encoded_image",
  "prompt": "Design description"
}
```

**Response:**
```json
{
  "generatedImage": "base64_encoded_decorated_image",
  "products": [
    {
      "name": "Product Name",
      "description": "Product description",
      "category": "Product category",
      "searchKeywords": "Search keywords",
      "amazonLink": "Amazon affiliate link"
    }
  ],
  "message": "Success message"
}
```

### POST /search
Generates Amazon search links for product keywords.

**Request Body:**
```json
{
  "keywords": ["keyword1", "keyword2"]
}
```

### GET /health
Health check endpoint for the API server.

## Development

### Running Tests
```bash
# Test the API endpoints
curl -X POST http://localhost:4000/design \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"test","prompt":"test"}'
```

### Building for Production
```bash
# Build the API server
cd api-server
npm run build

# Build the mobile app
cd ../app
npx expo build:android  # or build:ios
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini AI API key | Yes |
| `GEMINI_MODEL` | Gemini model to use | No (default: gemini-2.5-flash-image-preview) |
| `AMAZON_PARTNER_TAG` | Amazon affiliate tag | No |
| `AMAZON_HOST` | Amazon domain | No (default: amazon.com) |
| `NODE_ENV` | Environment mode | No (default: development) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the GitHub repository.
