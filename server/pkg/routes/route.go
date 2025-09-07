package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/r3aper2020/SnapDesign/pkg/models"
	"github.com/r3aper2020/SnapDesign/pkg/routes/decorate"
	search "github.com/r3aper2020/SnapDesign/pkg/routes/search"
	"github.com/r3aper2020/SnapDesign/pkg/security"
)

func SetupRoutes(router *gin.Engine) {
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})
}

func SetupSearchRoutes(router *gin.Engine, config *models.Config) {
	searchConfig := models.SearchConfig{
		AmazonPartnerTag: config.Amazon.AMAZON_PARTNER_TAG,
		AmazonHost:       config.Amazon.AMAZON_HOST,
	}
	router.POST("/search", security.JWTMiddleware(), search.SearchHandler(searchConfig))
}

func SetupDecorateRoutes(router *gin.Engine, config *models.Config) {
	router.POST("/decorate", security.JWTMiddleware(), decorate.DecorateHandler(*config))
}
