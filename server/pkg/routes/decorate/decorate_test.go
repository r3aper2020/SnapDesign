package decorate

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	dotenv "github.com/joho/godotenv"
	"github.com/r3aper2020/SnapDesign/pkg/models"
	testify "github.com/stretchr/testify/assert"
)

var envFile = flag.String("env", "", "Path to .env file")

func loadEnv() error {
	flag.Parse()

	// Check command line arg first
	if *envFile != "" {
		return dotenv.Load(fmt.Sprintf("../../../%s", *envFile))
	}

	// Fallback to ENV var
	if path := os.Getenv("ENV"); path != "" {
		return dotenv.Load(fmt.Sprintf("../../../%s", path))
	}

	// Default to .env in current directory
	return dotenv.Load(".env")
}

func loadConfig(t *testing.T) models.Config {
	if err := loadEnv(); err != nil {
		t.Logf("Warning: Failed to load .env file: %v", err)
		t.Log("Continuing with existing environment variables")
	}

	return models.Config{
		GCP: models.GCPConfig{
			GEMINI_API_KEY:     os.Getenv("GEMINI_API_KEY"),
			GEMINI_IMAGE_MODEL: os.Getenv("GEMINI_IMAGE_MODEL"),
			GEMINI_TEXT_MODEL:  os.Getenv("GEMINI_TEXT_MODEL"),
		},
		Amazon: models.AmazonConfig{
			AMAZON_HOST:        "www.amazon.com",
			AMAZON_PARTNER_TAG: "snapdesign-20",
		},
	}
}

func TestDecorateHandler(t *testing.T) {
	assert := testify.New(t)
	config := loadConfig(t)

	if config.GCP.GEMINI_API_KEY == "" {
		t.Skip("Skipping test: GEMINI_API_KEY not set")
	}

	t.Logf("Config: %+v", config)

	// Setup test router
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/decorate", DecorateHandler(config))

	// Read test image
	testImageBytes, err := os.ReadFile("../../ai/testDecorateImage.jpg")
	assert.NoError(err)
	testImageBase64 := base64.StdEncoding.EncodeToString(testImageBytes)

	// Create test request
	req := models.DecorateRequest{
		ImageBase64: testImageBase64,
		Description: "decorate this space with a modern theme",
		MimeType:    "jpeg",
	}

	// Serialize request to JSON
	reqBody, err := json.Marshal(req)
	assert.NoError(err)

	// Create test context with JSON body
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/decorate", bytes.NewBuffer(reqBody))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := DecorateHandler(config)
	handler(c)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Parse response
	if w.Code != http.StatusOK {
		var errResp struct {
			Error string `json:"error"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &errResp); err == nil {
			t.Logf("Server Error: %s", errResp.Error)
		}
		t.Fail()
		return
	}

	var response models.DecorateResponse
	assert.NoError(json.Unmarshal(w.Body.Bytes(), &response))
	assert.NotEmpty(response.EditedImageBase64)
	assert.NotNil(response.Products)
	assert.NotZero(response.TokenUsage.GrandTotal)

	// Save response image
	imageBytes, err := base64.StdEncoding.DecodeString(response.EditedImageBase64)
	assert.NoError(err)
	err = os.WriteFile("response.jpg", imageBytes, 0644)
	assert.NoError(err)
	t.Log("Saved decorated image to response.jpg")
}
