package ai

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/google/generative-ai-go/genai"
	"github.com/r3aper2020/SnapDesign/pkg/models"
	"google.golang.org/api/option"
)

type GeminiClient struct {
	Client     *genai.Client
	imageModel string
	textModel  string
}

// NewClient creates a new Gemini client
func NewClient(ctx context.Context, apiKey string) (*genai.Client, error) {
	return genai.NewClient(ctx, option.WithAPIKey(apiKey))
}

type GenerateDecoratedImageResponse struct {
	Response     *genai.GenerateContentResponse
	ImgBytes     []byte
	EditedBase64 string
}

func (g *GeminiClient) GenerateDecoratedImage(ctx context.Context, description string, mimeType string, cleanBase64 string) (*GenerateDecoratedImageResponse, error) {
	// Step 1: Generate decorated image
	imageModel := g.Client.GenerativeModel(g.imageModel)
	prompt := fmt.Sprintf(models.DecoratePrompt, description)

	imgBytes, err := base64.StdEncoding.DecodeString(cleanBase64)
	if err != nil {
		return nil, err
	}

	resp, err := imageModel.GenerateContent(ctx, genai.Text(prompt), genai.ImageData(mimeType, imgBytes))
	if err != nil {
		return nil, err
	}

	var editedBase64 string
	for _, part := range resp.Candidates[0].Content.Parts {
		if blob, ok := part.(genai.Blob); ok {
			editedBase64 = base64.StdEncoding.EncodeToString(blob.Data)
			break
		}
	}
	if editedBase64 == "" {
		return nil, fmt.Errorf("no image returned from image model")
	}

	return &GenerateDecoratedImageResponse{
		Response:     resp,
		ImgBytes:     imgBytes,
		EditedBase64: editedBase64,
	}, nil
}

func (g *GeminiClient) GenerateTextAnalysis(ctx context.Context, description string, mimeType string, editedBase64 string, imgBytes []byte) (*genai.GenerateContentResponse, error) {
	textModel := g.Client.GenerativeModel(g.textModel)
	analysisPromptText := fmt.Sprintf(models.AnalysisPrompt, description, description)

	editedImgBytes, _ := base64.StdEncoding.DecodeString(editedBase64)
	textResp, err := textModel.GenerateContent(ctx,
		genai.Text(analysisPromptText),
		genai.ImageData(mimeType, imgBytes),
		genai.ImageData("image/png", editedImgBytes),
	)
	if err != nil {
		return nil, err
	}

	return textResp, nil
}
func NewGeminiClient(ctx context.Context, apiKey string, imageModel string, textModel string) (*GeminiClient, error) {
	client, err := NewClient(ctx, apiKey)
	if err != nil {
		return nil, err
	}
	return &GeminiClient{
		Client:     client,
		imageModel: imageModel,
		textModel:  textModel,
	}, nil
}
