package ai

import (
	"context"
	"encoding/base64"
	"flag"
	"fmt"
	"os"
	"testing"

	dotenv "github.com/joho/godotenv"
	testify "github.com/stretchr/testify/assert"
)

var envFile = flag.String("env", "", "Path to .env file")

func loadEnv() error {
	flag.Parse()

	// Check command line arg first
	if *envFile != "" {
		return dotenv.Load(fmt.Sprintf("../../%s", *envFile))
	}

	// Fallback to ENV var
	if path := os.Getenv("ENV"); path != "" {
		return dotenv.Load(fmt.Sprintf("../../%s", path))
	}

	// Default to .env in current directory
	return dotenv.Load(".env")
}

func loadClientWithEnv(t *testing.T) (*GeminiClient, error) {
	if err := loadEnv(); err != nil {
		t.Logf("Warning: Failed to load .env file: %v", err)
		t.Log("Continuing with existing environment variables")
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	imageModel := os.Getenv("GEMINI_IMAGE_MODEL")
	textModel := os.Getenv("GEMINI_TEXT_MODEL")

	if apiKey == "" {
		t.Skip("Skipping test: GEMINI_API_KEY not set")
	}

	t.Logf("Using models: image=%s, text=%s", imageModel, textModel)
	return NewGeminiClient(context.Background(), apiKey, imageModel, textModel)
}

func TestNewGeminiClient(t *testing.T) {
	assert := testify.New(t)
	gc, err := loadClientWithEnv(t)
	assert.NotNil(gc)
	assert.NoError(err)
}

// func TestGenerateDecoratedImage(t *testing.T) {
// 	assert := testify.New(t)
// 	gc, err := loadClientWithEnv(t)
// 	assert.NotNil(gc)
// 	assert.NoError(err)

// 	testImageBytes, err := os.ReadFile("./testDecorateImage.jpg")
// 	assert.NoError(err)
// 	testImageBase64 := base64.StdEncoding.EncodeToString(testImageBytes)

// 	response, err := gc.GenerateDecoratedImage(context.Background(), "decorate this space", "jpeg", testImageBase64)
// 	assert.NoError(err)
// 	assert.NotNil(response)
// 	assert.NotNil(response.EditedBase64)
// 	assert.NotNil(response.ImgBytes)
// 	assert.NotNil(response.Response)
// 	assert.NotNil(response.Response.UsageMetadata)
// }

func TestGenerateTextAnalysis(t *testing.T) {
	assert := testify.New(t)
	gc, err := loadClientWithEnv(t)
	assert.NotNil(gc)
	assert.NoError(err)

	testImageBytes, err := os.ReadFile("./testDecorateImage.jpg")
	assert.NoError(err)
	testImageBase64 := base64.StdEncoding.EncodeToString(testImageBytes)

	responseDecoratedImage, err := gc.GenerateDecoratedImage(context.Background(), "decorate this space", "jpeg", testImageBase64)
	assert.NoError(err)
	assert.NotNil(responseDecoratedImage)
	assert.NotNil(responseDecoratedImage.EditedBase64)
	assert.NotNil(responseDecoratedImage.ImgBytes)
	assert.NotNil(responseDecoratedImage.Response)
	assert.NotNil(responseDecoratedImage.Response.UsageMetadata)

	responseAnalysis, err := gc.GenerateTextAnalysis(context.Background(), "decorate this space", "jpeg", responseDecoratedImage.EditedBase64, testImageBytes)
	assert.NoError(err)
	assert.NotNil(responseAnalysis)
	assert.NotNil(responseAnalysis.UsageMetadata)
}
