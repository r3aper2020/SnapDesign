package models

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig         `json:"server_config" yaml:"server_config,required"`
	Security ServerSecurityConfig `json:"server_security_config" yaml:"server_security_config,required"`
	GCP      GCPConfig            `json:"gcp_config" yaml:"gcp_config,required"`
	Amazon   AmazonConfig         `json:"amazon_config" yaml:"amazon_config,required"`
}

type ServerConfig struct {
	HTTPPort    string   `json:"http_port" yaml:"http_port,required"`
	TLSPort     string   `json:"tls_port" yaml:"tls_port,required"`
	TLSMode     string   `json:"tls_mode" yaml:"tls_mode,required"`
	TLSCertFile string   `json:"tls_cert_file" yaml:"tls_cert_file,required"`
	TLSKeyFile  string   `json:"tls_key_file" yaml:"tls_key_file,required"`
	TLSDomains  []string `json:"tls_domains" yaml:"tls_domains,required"`
	TLSEmail    string   `json:"tls_email" yaml:"tls_email,required"`
}

type ServerSecurityConfig struct {
	APIJWTSecret   string `json:"api_jwt_secret" yaml:"api_jwt_secret,required"`
	APIJWTIssuer   string `json:"api_jwt_issuer" yaml:"api_jwt_issuer,required"`
	APIJWTAudience string `json:"api_jwt_audience" yaml:"api_jwt_audience,required"`
}

type GCPConfig struct {
	GCP_PROJECT_ID     string `json:"gcp_project_id" yaml:"gcp_project_id,required"`
	GCP_REGION         string `json:"gcp_region" yaml:"gcp_region,required"`
	GEMINI_API_KEY     string `json:"gemini_api_key" yaml:"gemini_api_key,required"`
	GEMINI_IMAGE_MODEL string `json:"gemini_image_model" yaml:"gemini_image_model,required"`
	GEMINI_TEXT_MODEL  string `json:"gemini_text_model" yaml:"gemini_text_model,required"`
}

type AmazonConfig struct {
	AMAZON_HOST         string `json:"amazon_host" yaml:"amazon_host,required"`
	AMAZON_ACCESS_KEY   string `json:"amazon_access_key" yaml:"amazon_access_key,required"`
	AMAZON_SECRET_KEY   string `json:"amazon_secret_key" yaml:"amazon_secret_key,required"`
	AMAZON_PARTNER_TAG  string `json:"amazon_partner_tag" yaml:"amazon_partner_tag,required"`
	AMAZON_PARTNER_TYPE string `json:"amazon_partner_type" yaml:"amazon_partner_type,required"`
	AMAZON_MARKETPLACE  string `json:"amazon_marketplace" yaml:"amazon_marketplace,required"`
}

func LoadConfig(filepath string) (*Config, error) {
	configData, err := os.ReadFile(filepath)
	if err != nil {
		return nil, err
	}
	config := &Config{}
	if err := yaml.Unmarshal(configData, config); err != nil {
		return nil, err
	}
	return config, nil
}
