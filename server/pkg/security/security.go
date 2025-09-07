package security

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
	"github.com/r3aper2020/SnapDesign/pkg/models"
	"golang.org/x/crypto/acme/autocert"
)

// Run starts the HTTP/HTTPS servers based on environment configuration.
// Modes:
// - TLS_MODE=local: uses TLS_CERT_FILE and TLS_KEY_FILE, redirects HTTP -> HTTPS
// - TLS_MODE=autocert: uses Let's Encrypt via autocert for TLS_DOMAIN, redirects HTTP -> HTTPS
// - default/empty: HTTP only on PORT
func Run(router *gin.Engine, config *models.Config) error {
	switch strings.ToLower(config.Server.TLSMode) {
	case "local":
		if config.Server.TLSCertFile == "" || config.Server.TLSKeyFile == "" {
			log.Println("[security] TLS_MODE=local requires TLS_CERT_FILE and TLS_KEY_FILE. Falling back to HTTP only.")
			return runHTTPOnly(router, config.Server.HTTPPort)
		}
		return runWithLocalCert(router, config.Server.HTTPPort, config.Server.TLSPort, config.Server.TLSCertFile, config.Server.TLSKeyFile)

	case "autocert", "letsencrypt":
		domains := splitCSV(os.Getenv("TLS_DOMAIN"))
		if len(domains) == 0 {
			log.Println("[security] TLS_MODE=autocert requires TLS_DOMAIN (comma-separated). Falling back to HTTP only.")
			return runHTTPOnly(router, config.Server.HTTPPort)
		}
		cacheDir := getEnvOrDefault("TLS_CACHE_DIR", ".cert-cache")
		email := config.Server.TLSEmail
		return runWithAutoCert(router, config.Server.HTTPPort, config.Server.TLSPort, domains, cacheDir, email)

	default:
		return runHTTPOnly(router, config.Server.HTTPPort)
	}
}

func runHTTPOnly(handler http.Handler, httpPort string) error {
	server := &http.Server{Addr: ":" + httpPort, Handler: handler}
	log.Printf("[security] Starting HTTP on :%s\n", httpPort)
	return server.ListenAndServe()
}

func runWithLocalCert(handler http.Handler, httpPort, tlsPort, certFile, keyFile string) error {
	// HTTP server redirects to HTTPS
	go func() {
		redir := &http.Server{Addr: ":" + httpPort, Handler: http.HandlerFunc(redirectToHTTPS(tlsPort))}
		log.Printf("[security] Redirecting HTTP :%s -> HTTPS :%s\n", httpPort, tlsPort)
		if err := redir.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("[security] HTTP redirect server error: %v\n", err)
		}
	}()

	// HTTPS server with provided certs
	httpsSrv := &http.Server{Addr: ":" + tlsPort, Handler: handler}
	log.Printf("[security] Starting HTTPS on :%s (local cert)\n", tlsPort)
	return httpsSrv.ListenAndServeTLS(certFile, keyFile)
}

func runWithAutoCert(handler http.Handler, httpPort, tlsPort string, domains []string, cacheDir, email string) error {
	manager := &autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(domains...),
		Cache:      autocert.DirCache(cacheDir),
		Email:      email,
	}

	// HTTP server serves ACME challenges and redirects other requests to HTTPS
	go func() {
		acmeHandler := manager.HTTPHandler(http.HandlerFunc(redirectToHTTPS(tlsPort)))
		redir := &http.Server{Addr: ":" + httpPort, Handler: acmeHandler}
		log.Printf("[security] Autocert ACME + redirect on HTTP :%s; HTTPS :%s\n", httpPort, tlsPort)
		if err := redir.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("[security] HTTP ACME server error: %v\n", err)
		}
	}()

	// HTTPS server managed by autocert
	httpsSrv := &http.Server{
		Addr:      ":" + tlsPort,
		Handler:   handler,
		TLSConfig: &tls.Config{GetCertificate: manager.GetCertificate},
	}
	log.Printf("[security] Starting HTTPS with autocert on :%s for domains: %v\n", tlsPort, domains)
	return httpsSrv.ListenAndServeTLS("", "")
}

func redirectToHTTPS(tlsPort string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		// Strip existing port and apply TLS port if non-standard
		if colon := strings.LastIndex(host, ":"); colon != -1 {
			host = host[:colon]
		}
		portPart := ""
		if tlsPort != "443" && tlsPort != "" {
			portPart = ":" + tlsPort
		}
		target := "https://" + host + portPart + r.URL.RequestURI()
		http.Redirect(w, r, target, http.StatusMovedPermanently)
	}
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func defaultTLSPort(mode string) string {
	switch strings.ToLower(mode) {
	case "local":
		return "8443" // safe default for local dev
	case "autocert", "letsencrypt":
		return "443"
	default:
		return ""
	}
}

func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var out []string
	for _, p := range parts { // ranged loop per preference
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// JWTMiddleware validates Bearer tokens signed with HS256.
// Env:
// - API_JWT_SECRET (required)
// - API_JWT_ISSUER (default: snapdesign-app)
// - API_JWT_AUDIENCE (default: snapdesign-api)
func JWTMiddleware() gin.HandlerFunc {
	secret := os.Getenv("API_JWT_SECRET")
	if secret == "" {
		log.Println("[security] API_JWT_SECRET not set; all requests will be unauthorized")
	}

	expectedIssuer := getEnvOrDefault("API_JWT_ISSUER", "snapdesign-app")
	expectedAudience := getEnvOrDefault("API_JWT_AUDIENCE", "snapdesign-api")

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if tokenString == "" || secret == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %T", t.Method)
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
			return
		}

		if iss, _ := claims["iss"].(string); iss != expectedIssuer {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid issuer"})
			return
		}
		if aud, _ := claims["aud"].(string); aud != expectedAudience {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid audience"})
			return
		}
		if expVal, ok := claims["exp"]; ok {
			if v, ok := expVal.(float64); ok {
				if time.Now().Unix() > int64(v) {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
					return
				}
			}
		}

		c.Next()
	}
}
