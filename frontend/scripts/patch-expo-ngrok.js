#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../../node_modules/@expo/cli/build/src/start/server/AsyncNgrok.js');

if (!fs.existsSync(targetPath)) {
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');

let modified = false;

// 1. Support NGROK_AUTHTOKEN in NGROK_CONFIG
if (!content.includes('process.env.NGROK_AUTHTOKEN')) {
  content = content.replace(
    "authToken: '5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8',",
    "authToken: process.env.NGROK_AUTHTOKEN || '5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8',"
  );
  modified = true;
}

// 2. Bypass exp.direct custom hostname when personal NGROK_AUTHTOKEN is provided
if (!content.includes('if (process.env.NGROK_AUTHTOKEN) {\n            return {};\n        }')) {
  content = content.replace(
    'async _getConnectionPropsAsync() {',
    'async _getConnectionPropsAsync() {\n        if (process.env.NGROK_AUTHTOKEN) {\n            return {};\n        }'
  );
  modified = true;
}

// 3. Pass custom token to connect
if (!content.includes('const token = process.env.NGROK_AUTHTOKEN || NGROK_CONFIG.authToken;')) {
  content = content.replace(
    'authtoken: NGROK_CONFIG.authToken,',
    'authtoken: process.env.NGROK_AUTHTOKEN || NGROK_CONFIG.authToken,'
  );
  modified = true;
}

if (modified) {
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('[Raha] Applied @expo/cli patch for custom Ngrok authtoken support.');
}

// 4. Patch @expo/ngrok/src/client.js to sanitize startTunnel options for ngrok v3
const clientPath = path.resolve(__dirname, '../../node_modules/@expo/ngrok/src/client.js');
if (fs.existsSync(clientPath)) {
  let clientContent = fs.readFileSync(clientPath, 'utf8');
  if (clientContent.includes('return this.request("post", "api/tunnels", options);')) {
    clientContent = clientContent.replace(
      'return this.request("post", "api/tunnels", options);',
      `const payload = {
      name: options.name,
      proto: options.proto || "http",
      addr: String(options.addr || options.port || 80),
    };
    if (options.subdomain) payload.subdomain = options.subdomain;
    if (options.hostname) payload.hostname = options.hostname;
    if (options.auth) payload.auth = options.auth;
    if (options.inspect !== undefined) payload.inspect = options.inspect;
    return this.request("post", "api/tunnels", payload);`
    );
    fs.writeFileSync(clientPath, clientContent, 'utf8');
    console.log('[Raha] Applied @expo/ngrok client patch for ngrok v3 compatibility.');
  }
}

// 5. Patch @expo/ngrok/index.js to handle tunnel already exists
const indexPath = path.resolve(__dirname, '../../node_modules/@expo/ngrok/index.js');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  if (!indexContent.includes('already exists')) {
    indexContent = indexContent.replace(
      'if (!isRetriable(err) || retryCount >= 100) {',
      `if (err.body && err.body.msg && err.body.msg.includes('already exists')) {
      try {
        const detail = await ngrokClient.tunnelDetail(opts.name);
        if (detail && detail.public_url) return detail.public_url;
      } catch (_) {}
    }
    if (!isRetriable(err) || retryCount >= 100) {`
    );
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log('[Raha] Applied @expo/ngrok index patch for tunnel collision recovery.');
  }
}
