#!/bin/bash

# Generate self-signed certificates for local development
# This script requires openssl to be installed

# Set variables for certificate generation
CERT_DIR="."
DAYS_VALID=365
COUNTRY="US"
STATE="CA" 
LOCALITY="San Francisco"
ORGANIZATION="SnapDesign Development"
COMMON_NAME="localhost"

# Create certs directory if it doesn't exist
mkdir -p $CERT_DIR

# Generate private key and certificate
openssl req -x509 \
  -nodes \
  -newkey rsa:2048 \
  -keyout $CERT_DIR/server.key \
  -out $CERT_DIR/server.crt \
  -days $DAYS_VALID \
  -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/CN=$COMMON_NAME"

# Set permissions
chmod 600 $CERT_DIR/server.key
chmod 644 $CERT_DIR/server.crt

echo "Generated self-signed certificates in $CERT_DIR:"
echo "  - server.key (private key)"
echo "  - server.crt (certificate)"
