package models

type SearchConfig struct {
	AmazonPartnerTag string `json:"amazon_partner_tag"`
	AmazonHost       string `json:"amazon_host"`
}

// SearchRequest is the request body for the search endpoint
type SearchRequest struct {
	Keywords []string `json:"keywords"`
}

// ProductResponse is the response body for the search endpoint
type ProductResponse struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Thumbnail string `json:"thumbnail"`
	Price     any    `json:"price"`
	URL       string `json:"url"`
}
