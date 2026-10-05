const fs = require('fs');
const path = require('path');
const os = require('os');

const appDir = path.join(os.homedir(), '.optimizer-panel');
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

function createPlaceholderIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0%" stop-color="#1dd3b0"/>
          <stop offset="100%" stop-color="#2bd4ff"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="32" fill="#091722"/>
      <rect x="28" y="28" width="200" height="200" rx="30" fill="url(#g)" opacity="0.18"/>
      <path d="M62 150 L118 82 L145 110 L194 62 L196 162 L62 162 Z" fill="url(#g)"/>
      <circle cx="88" cy="168" r="14" fill="#0fe3c7"/>
      <circle cx="170" cy="170" r="14" fill="#2bd4ff"/>
    </svg>
  `;

  const iconPath = path.join(buildDir, 'icon.svg');
  fs.writeFileSync(iconPath, svg, 'utf8');
  console.log('Icon placeholder created at', iconPath);
}

createPlaceholderIcon();
