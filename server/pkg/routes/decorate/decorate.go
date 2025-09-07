package decorate

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"github.com/r3aper2020/SnapDesign/pkg/models"
	"google.golang.org/api/option"
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
			req.MimeType = "image/jpeg"
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
		ctx := context.Background()
		client, err := genai.NewClient(ctx, option.WithAPIKey(config.GCP.GEMINI_API_KEY))
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to initialize Gemini client"})
			return
		}
		defer client.Close()

		// Step 1: Generate decorated image
		imageModel := client.GenerativeModel(config.GCP.GEMINI_IMAGE_MODEL)
		prompt := fmt.Sprintf(models.DecoratePrompt, req.Description)

		imgBytes, err := base64.StdEncoding.DecodeString(cleanBase64)
		if err != nil {
			c.JSON(400, gin.H{"error": "invalid base64 image"})
			return
		}

		resp, err := imageModel.GenerateContent(ctx, genai.Text(prompt), genai.ImageData(req.MimeType, imgBytes))
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to generate decorated image"})
			return
		}

		var editedBase64 string
		for _, part := range resp.Candidates[0].Content.Parts {
			if blob, ok := part.(genai.Blob); ok {
				editedBase64 = base64.StdEncoding.EncodeToString(blob.Data)
				break
			}
		}
		if editedBase64 == "" {
			c.JSON(500, gin.H{"error": "no image returned from image model"})
			return
		}

		// Step 2: Analyze changes
		textModel := client.GenerativeModel(config.GCP.GEMINI_TEXT_MODEL)
		analysisPromptText := fmt.Sprintf(models.AnalysisPrompt, req.Description, req.Description)

		editedImgBytes, _ := base64.StdEncoding.DecodeString(editedBase64)
		textResp, err := textModel.GenerateContent(ctx,
			genai.Text(analysisPromptText),
			genai.ImageData(req.MimeType, imgBytes),
			genai.ImageData("image/png", editedImgBytes),
		)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to analyze images"})
			return
		}

		// Parse product analysis
		productsText := ""
		for _, part := range textResp.Candidates[0].Content.Parts {
			if text, ok := part.(genai.Text); ok {
				productsText = string(text)
				break
			}
		}

		if strings.Contains(productsText, "```json") {
			parts := strings.Split(productsText, "```json")
			if len(parts) > 1 {
				productsText = strings.Split(parts[1], "```")[0]
			}
		} else if strings.Contains(productsText, "```") {
			parts := strings.Split(productsText, "```")
			if len(parts) > 1 {
				productsText = parts[1]
			}
		}

		var products models.ProductAnalysis
		if err := json.Unmarshal([]byte(productsText), &products); err != nil {
			c.JSON(500, gin.H{"error": "failed to parse AI response"})
			return
		}

		// Add Amazon links
		for i := range products.Items {
			product := &products.Items[i]
			searchTerms := []string{}

			if product.Qty > 1 {
				searchTerms = append(searchTerms, fmt.Sprintf("%d", product.Qty))
			}
			if product.Color != nil {
				searchTerms = append(searchTerms, *product.Color)
			}

			searchDesc := product.Name
			if product.Placement.Note != nil {
				note := strings.ToLower(*product.Placement.Note)
				switch {
				case strings.Contains(note, "above"), strings.Contains(note, "hanging"):
					searchDesc = "hanging " + searchDesc
				case strings.Contains(note, "large"), strings.Contains(note, "tall"):
					searchDesc = "large " + searchDesc
				case strings.Contains(note, "human"), strings.Contains(note, "life size"):
					searchDesc = "human sized " + searchDesc
				case strings.Contains(note, "small"), strings.Contains(note, "mini"):
					searchDesc = "small " + searchDesc
				}
			}

			searchTerms = append(searchTerms, searchDesc, product.Description)
			searchQuery := url.QueryEscape(strings.Join(searchTerms, " "))
			product.AmazonLink = fmt.Sprintf("https://%s/s?k=%s&tag=%s",
				config.Amazon.AMAZON_HOST,
				searchQuery,
				config.Amazon.AMAZON_PARTNER_TAG,
			)
		}

		// Build response with token metrics
		response := models.DecorateResponse{
			EditedImageBase64: editedBase64,
			Products:          &products,
			TokenUsage: models.TokenMetrics{
				ImageGeneration: struct{ models.TokenUsage }{
					TokenUsage: models.TokenUsage{
						InputTokens:  int(resp.UsageMetadata.PromptTokenCount),
						OutputTokens: int(resp.UsageMetadata.CandidatesTokenCount),
						TotalTokens:  int(resp.UsageMetadata.TotalTokenCount),
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

		c.JSON(200, response)
	}
}
