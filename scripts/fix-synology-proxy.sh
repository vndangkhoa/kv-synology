#!/usr/bin/env bash
# ==============================================================================
# Synology DSM Reverse Proxy Diagnostics & Fix Script
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo " [1/4] Checking Root Partition Disk Space (/)"
echo "========================================================"
df -h /
ROOT_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$ROOT_USAGE" -ge 90 ]; then
    echo "⚠️  WARNING: Root partition is ${ROOT_USAGE}% full! Cleaning old logs..."
    sudo find /var/log -type f \( -name "*.gz" -o -name "*.1" -o -name "*.2" -o -name "*.old" \) -delete || true
    echo "✅ Cleaned log archives. Current status:"
    df -h /
else
    echo "✅ Disk space on root partition is healthy (${ROOT_USAGE}%)."
fi

echo ""
echo "========================================================"
echo " [2/4] Verifying Nginx Configuration Syntax"
echo "========================================================"
if [ -f /etc/nginx/nginx.conf.run ]; then
    echo "Running: sudo nginx -t -c /etc/nginx/nginx.conf.run"
    sudo nginx -t -c /etc/nginx/nginx.conf.run || echo "❌ Nginx configuration error detected!"
else
    echo "Running: sudo nginx -t"
    sudo nginx -t || echo "❌ Nginx configuration error detected!"
fi

echo ""
echo "========================================================"
echo " [3/4] Checking ReverseProxy.json & Backing Up"
echo "========================================================"
RP_FILE="/usr/syno/etc/www/ReverseProxy.json"
if [ -f "$RP_FILE" ]; then
    BACKUP_FILE="${RP_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
    sudo cp "$RP_FILE" "$BACKUP_FILE"
    echo "✅ Backup created at: $BACKUP_FILE"
    echo "Checking JSON format:"
    if which jq >/dev/null 2>&1; then
        jq . "$RP_FILE" >/dev/null 2>&1 && echo "✅ ReverseProxy.json is valid JSON." || echo "❌ Warning: ReverseProxy.json has syntax issues!"
    else
        echo "ℹ️  jq not installed, file exists ($(wc -c < "$RP_FILE") bytes)."
    fi
else
    echo "ℹ️  $RP_FILE not found or no rules created yet."
fi

echo ""
echo "========================================================"
echo " [4/4] Reloading / Restarting DSM Nginx Service"
echo "========================================================"
if which synosystemctl >/dev/null 2>&1; then
    echo "Restarting Nginx with synosystemctl..."
    sudo synosystemctl restart nginx
elif which systemctl >/dev/null 2>&1; then
    echo "Restarting Nginx with systemctl..."
    sudo systemctl restart nginx
else
    echo "Reloading Nginx with nginx -s reload..."
    sudo nginx -s reload
fi
echo "✅ Nginx service restarted successfully!"

echo ""
echo "========================================================"
echo "🎉 Done! Please refresh your DSM browser tab and try saving the Reverse Proxy rule again."
echo "========================================================"
