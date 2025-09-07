package pkg

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/r3aper2020/SnapDesign/pkg/models"
	"github.com/r3aper2020/SnapDesign/pkg/routes"
	"github.com/r3aper2020/SnapDesign/pkg/security"
)

func StartServer() {
	config, err := models.LoadConfig("config/config.yaml")
	if err != nil {
		log.Fatal("Failed to load config: ", err)
	}
	// Initialize Gin router
	router := gin.Default()

	// Add CORS middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Setup routes
	routes.SetupRoutes(router)
	routes.SetupSearchRoutes(router, config)

	// Start server with HTTP/HTTPS handling
	if err := security.Run(router, config); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}
