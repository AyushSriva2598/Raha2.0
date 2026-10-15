#!/usr/bin/env node
const { spawn } = require('child_process');

const fs = require('fs');
const path = require('path');

// Collect passed arguments
const rawArgs = process.argv.slice(2);

// Map custom/shorthand tunnel arguments to Expo CLI's --tunnel
const mappedArgs = rawArgs.map((arg) => {
  if (arg === '--start-tunnel') return '--tunnel';
  return arg;
});

const isTunnel = mappedArgs.includes('--tunnel');

// Ensure .env is read into process.env before spawning
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (key && !(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  });
}

if (isTunnel) {
  if (process.env.NGROK_AUTHTOKEN) {
    console.log('\x1b[36m[Raha Tunnel]\x1b[0m Using configured NGROK_AUTHTOKEN for dedicated tunnel.');
  } else {
    console.log('\x1b[33m[Raha Tunnel]\x1b[0m Starting tunnel via Expo shared Ngrok pool.');
    console.log('\x1b[90m(Tip: To avoid intermittent "remote gone away" congestion on Expo\'s shared pool, get a free token from https://dashboard.ngrok.com/get-started/your-authtoken and set NGROK_AUTHTOKEN in .env)\x1b[0m');
  }
}

// Automatically configure adb reverse for connected Android USB devices
try {
  const { execSync } = require('child_process');
  const devices = execSync('adb devices', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).toString();
  const hasConnectedDevice = devices.split('\n').slice(1).some((line) => line.trim().endsWith('device'));
  if (hasConnectedDevice) {
    execSync('adb reverse tcp:4000 tcp:4000 && adb reverse tcp:8081 tcp:8081', { stdio: 'ignore', timeout: 2000 });
    console.log('\x1b[32m[Raha ADB]\x1b[0m Configured adb reverse tcp:4000 (Backend) & tcp:8081 (Metro) on connected device.');
  }
} catch {
  // Ignore if adb is not present or device is unreachable
}

// Spawn expo start with forwarded arguments
const isBun = process.env.npm_execpath && process.env.npm_execpath.includes('bun');
const bin = isBun ? 'bunx' : 'npx';
const frontendDir = path.resolve(__dirname, '..');
const child = spawn(bin, ['expo', 'start', ...mappedArgs], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
  },
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start Expo:', err);
  process.exit(1);
});
