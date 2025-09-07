package decorate

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"github.com/r3aper2020/SnapDesign/pkg/models"
)

func AddAmazonLinks(textResp *genai.GenerateContentResponse, config models.AmazonConfig) (models.ProductAnalysis, error) {
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
		return models.ProductAnalysis{}, err
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
			config.AMAZON_HOST,
			searchQuery,
			config.AMAZON_PARTNER_TAG,
		)
	}

	return products, nil
}
