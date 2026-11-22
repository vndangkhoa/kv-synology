const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8090;
const SIMULATOR_HTML = path.join(__dirname, 'index.html');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const APP_PUBLIC_DIR = path.join(__dirname, '..', '..', 'ios', 'App', 'App', 'public');
const BUILD_DIR = path.join(__dirname, '..', 'build');

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Direct IPA Download
    if (pathname === '/download/ipa' || pathname === '/KVSynology-Native.ipa' || pathname === '/KVSynology-Ionic.ipa') {
        let ipaPath = path.join(BUILD_DIR, 'KVSynology-Native.ipa');
        if (!fs.existsSync(ipaPath)) {
            ipaPath = path.join(BUILD_DIR, 'KVSynology-Ionic.ipa');
        }
        if (fs.existsSync(ipaPath)) {
            const filename = path.basename(ipaPath);
            const stat = fs.statSync(ipaPath);
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': stat.size
            });
            fs.createReadStream(ipaPath).pipe(res);
            return;
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('IPA file not found');
            return;
        }
    }

    // Proxy /api/ requests to the Next.js DSM backend (:8088)
    if (pathname.startsWith('/api/')) {
        const proxyReq = http.request({
            hostname: '127.0.0.1',
            port: 8088,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                host: 'localhost:8088'
            }
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: { message: 'Backend proxy error: ' + err.message } }));
        });

        req.pipe(proxyReq);
        return;
    }

    // Serve Ionic/Capacitor App Web Assets
    if (pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/')) {
        let relPath = pathname.replace(/^\/app\/?/, '');
        if (!relPath || relPath === '') relPath = 'index.html';
        const targetPath = path.join(APP_PUBLIC_DIR, relPath);
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            return serveFile(targetPath, res);
        }
    }

    // Simulator Shell
    let filePath = SIMULATOR_HTML;
    if (pathname === '/' || pathname === '/index.html') {
        filePath = SIMULATOR_HTML;
    } else if (pathname.startsWith('/favicon') || pathname.startsWith('/apple-touch-icon') || pathname.startsWith('/icon-')) {
        const publicFile = path.join(PUBLIC_DIR, path.basename(pathname));
        if (fs.existsSync(publicFile)) {
            filePath = publicFile;
        }
    }

    serveFile(filePath, res);
});

function serveFile(filePath, res) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error: ' + err.message);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'text/html';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.svg') contentType = 'image/svg+xml';
        if (ext === '.ico') contentType = 'image/x-icon';
        if (ext === '.js') contentType = 'application/javascript';
        if (ext === '.css') contentType = 'text/css';
        if (ext === '.json') contentType = 'application/json';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(content);
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[iOS Simulator Server] Running at http://localhost:${PORT}`);
    console.log(`[iOS Simulator Server] Ionic App: http://localhost:${PORT}/app/index.html`);
    console.log(`[iOS Simulator Server] IPA Download: http://localhost:${PORT}/download/ipa`);
});
