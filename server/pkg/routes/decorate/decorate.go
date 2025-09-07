package decorate

import (
	"context"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/r3aper2020/SnapDesign/pkg/ai"
	"github.com/r3aper2020/SnapDesign/pkg/models"
)

func DecorateHandler(config models.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.DecorateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "invalid request body"})
			return
		}

		if req.ImageBase64 == "" {
			c.JSON(400, gin.H{"error": "imageBase64 is required"})
			return
		}

		if req.Description == "" {
			req.Description = "decorate this space"
		}
		if req.MimeType == "" {
			req.MimeType = "jpeg"
		}

		// Strip data URL prefix if present
		cleanBase64 := req.ImageBase64
		if strings.Contains(cleanBase64, ";base64,") {
			parts := strings.Split(cleanBase64, ";base64,")
			if len(parts) > 1 {
				cleanBase64 = parts[1]
			}
		}

		// Initialize Gemini client
		log.Printf("Initializing Gemini client\n🤖 Using models:\nimage model:%s\ntext model:%s\n", config.GCP.GEMINI_IMAGE_MODEL, config.GCP.GEMINI_TEXT_MODEL)
		ctx := context.Background()
		gc, err := ai.NewGeminiClient(ctx, config.GCP.GEMINI_API_KEY, config.GCP.GEMINI_IMAGE_MODEL, config.GCP.GEMINI_TEXT_MODEL)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to initialize Gemini client"})
			return
		}
		defer gc.Client.Close()

		// Step 1: Generate decorated image
		generateDecoratedImageResponse, err := gc.GenerateDecoratedImage(ctx, req.Description, req.MimeType, cleanBase64)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to generate decorated image"})
			return
		}

		// Step 2: Analyze changes
		textResp, err := gc.GenerateTextAnalysis(ctx, req.Description, req.MimeType, generateDecoratedImageResponse.EditedBase64, generateDecoratedImageResponse.ImgBytes)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to analyze images"})
			return
		}

		// Parse product analysis
		products, err := AddAmazonLinks(textResp, config.Amazon)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to add Amazon links"})
			return
		}

		// Build response with token metrics
		response := models.DecorateResponse{
			EditedImageBase64: generateDecoratedImageResponse.EditedBase64,
			Products:          &products,
			TokenUsage: models.TokenMetrics{
				ImageGeneration: struct{ models.TokenUsage }{
					TokenUsage: models.TokenUsage{
						InputTokens:  int(generateDecoratedImageResponse.Response.UsageMetadata.PromptTokenCount),
						OutputTokens: int(generateDecoratedImageResponse.Response.UsageMetadata.CandidatesTokenCount),
						TotalTokens:  int(generateDecoratedImageResponse.Response.UsageMetadata.TotalTokenCount),
					},
				},
				TextAnalysis: struct{ models.TokenUsage }{
					TokenUsage: models.TokenUsage{
						InputTokens:  int(textResp.UsageMetadata.PromptTokenCount),
						OutputTokens: int(textResp.UsageMetadata.CandidatesTokenCount),
						TotalTokens:  int(textResp.UsageMetadata.TotalTokenCount),
					},
				},
			},
		}

		// Calculate totals
		response.TokenUsage.GrandTotal = response.TokenUsage.ImageGeneration.TotalTokens +
			response.TokenUsage.TextAnalysis.TotalTokens
		response.TokenUsage.InputTokensTotal = response.TokenUsage.ImageGeneration.InputTokens +
			response.TokenUsage.TextAnalysis.InputTokens
		response.TokenUsage.OutputTokensTotal = response.TokenUsage.ImageGeneration.OutputTokens +
			response.TokenUsage.TextAnalysis.OutputTokens

		log.Printf("🖼️ Total token usage:\ninput tokens: %d\noutput tokens: %d\n💰 Total token usage for this generation: %d\n", response.TokenUsage.InputTokensTotal, response.TokenUsage.OutputTokensTotal, response.TokenUsage.GrandTotal)

		c.JSON(200, response)
	}
}
