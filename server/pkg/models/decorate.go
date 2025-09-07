package models

type DecorateRequest struct {
	ImageBase64 string `json:"imageBase64"`
	Description string `json:"description"`
	MimeType    string `json:"mimeType"`
}

type ProductItem struct {
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Qty         int       `json:"qty"`
	Color       *string   `json:"color,omitempty"`
	Description string    `json:"description"`
	Keywords    []string  `json:"keywords"`
	Placement   Placement `json:"placement"`
	EstPriceUSD *float64  `json:"estPriceUSD,omitempty"`
	AmazonLink  string    `json:"amazonLink"`
}

type Placement struct {
	Note     *string   `json:"note,omitempty"`
	BBoxNorm []float64 `json:"bboxNorm"`
}

type ProductAnalysis struct {
	Description string        `json:"description"`
	Items       []ProductItem `json:"items"`
	SafetyNotes string        `json:"safetyNotes"`
}

type TokenUsage struct {
	InputTokens  int `json:"inputTokens"`
	OutputTokens int `json:"outputTokens"`
	TotalTokens  int `json:"totalTokens"`
}

type TokenMetrics struct {
	ImageGeneration struct {
		TokenUsage
	} `json:"imageGeneration"`
	TextAnalysis struct {
		TokenUsage
	} `json:"textAnalysis"`
	GrandTotal        int `json:"grandTotal"`
	InputTokensTotal  int `json:"inputTokensTotal"`
	OutputTokensTotal int `json:"outputTokensTotal"`
}

type DecorateResponse struct {
	EditedImageBase64 string           `json:"editedImageBase64"`
	Products          *ProductAnalysis `json:"products"`
	TokenUsage        TokenMetrics     `json:"tokenUsage"`
}
