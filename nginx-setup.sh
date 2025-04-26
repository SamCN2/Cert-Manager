#!/bin/bash

# Create necessary directories if they don't exist
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
sudo mkdir -p /var/www/cert-info

# Create the certificate info display application
cat << 'EOF' > /var/www/cert-info/package.json
{
  "name": "cert-info",
  "version": "1.0.0",
  "description": "Certificate Information Display",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

# Create the Node.js server
cat << 'EOF' > /var/www/cert-info/server.js
const express = require('express');
const app = express();
const port = 3008;

app.get('/', (req, res) => {
    const certInfo = {
        verify: req.headers['ssl-client-verify'] || 'NONE',
        dn: req.headers['ssl-client-s-dn'] || 'Not Available',
        serial: req.headers['ssl-client-serial'] || 'Not Available'
    };

    if (certInfo.verify !== 'SUCCESS') {
        return res.send(createHtml('No valid client certificate presented'));
    }

    const html = createHtml(`
        <div class="cert-info">
            <p><strong>Verification Status:</strong> ${escapeHtml(certInfo.verify)}</p>
            <p><strong>Subject DN:</strong> ${escapeHtml(certInfo.dn)}</p>
            <p><strong>Serial Number:</strong> ${escapeHtml(certInfo.serial)}</p>
        </div>
    `);

    res.send(html);
});

function createHtml(content) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Client Certificate Information</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 40px;
                    line-height: 1.6;
                }
                .cert-info {
                    background: #f5f5f5;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                h2 {
                    color: #333;
                }
                strong {
                    color: #666;
                }
            </style>
        </head>
        <body>
            <h2>Certificate Information</h2>
            ${content}
        </body>
        </html>
    `;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

app.listen(port, '127.0.0.1', () => {
    console.log(`Certificate info server running at http://127.0.0.1:${port}`);
});
EOF

# Create the Nginx configuration
cat << 'EOF' > /etc/nginx/sites-available/certm3
# Default server for non-certificate requests
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

# Main server block for all services
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name urp.ogt11.com;
    
    ssl_certificate /etc/certs/CA/certM3/server.crt;
    ssl_certificate_key /etc/certs/CA/certM3/server.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Location for user-request service (no client cert)
    location /request {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Location for cert-request service (no client cert)
    location /cert-request {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Location for certificate info display (requires client cert)
    location /secure {
        # Client certificate configuration
        ssl_client_certificate /etc/certs/CA/certM3/ca.crt;
        ssl_verify_client on;
        ssl_verify_depth 2;

        # Proxy to Node.js cert info service
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # Pass SSL client cert info
        proxy_set_header ssl-client-verify $ssl_client_verify;
        proxy_set_header ssl-client-s-dn   $ssl_client_s_dn;
        proxy_set_header ssl-client-serial $ssl_client_serial;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/certm3 /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Install Node.js dependencies for cert-info service
cd /var/www/cert-info && npm install

# Create a systemd service for the cert-info application
cat << 'EOF' > /etc/systemd/system/cert-info.service
[Unit]
Description=Certificate Info Display Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/cert-info
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Set proper permissions
sudo chown -R www-data:www-data /var/www/cert-info

# Enable and start the cert-info service
sudo systemctl enable cert-info
sudo systemctl start cert-info

# Test Nginx configuration
sudo nginx -t

# If test is successful, reload Nginx
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "Nginx configuration has been updated successfully"
else
    echo "Error in Nginx configuration. Please check the syntax"
fi 