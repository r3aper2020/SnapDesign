package search

import (
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"
	common "github.com/r3aper2020/SnapDesign/pkg/common"
	models "github.com/r3aper2020/SnapDesign/pkg/models"
)

func SearchHandler(config models.SearchConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.SearchRequest
		if err := c.ShouldBindJSON(&req); err != nil || len(req.Keywords) == 0 {
			c.JSON(400, gin.H{"error": "keywords array is required"})
			return
		}

		searchQuery := url.QueryEscape(common.JoinWithSpace(req.Keywords))
		baseURL := "https://" + config.AmazonHost + "/s?k=" + searchQuery
		urlWithTag := baseURL
		urlWithTag = baseURL + "&tag=" + url.QueryEscape(config.AmazonPartnerTag)

		var products []models.ProductResponse
		for i := range req.Keywords { // ranged loop per preference
			if i >= 3 {
				break
			}
			products = append(products, models.ProductResponse{
				ID:        "stub-" + strconv.Itoa(i),
				Title:     req.Keywords[i] + " - sample item",
				Thumbnail: "https://via.placeholder.com/128",
				Price:     nil,
				URL:       urlWithTag,
			})
		}

		c.JSON(200, gin.H{
			"products": products,
			"provider": "amazon-stub",
		})
	}
}
