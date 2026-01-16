/**
 * Favicon Generation Script
 * Generates PNG favicons from SVG for cross-browser compatibility
 * 
 * Note: This script requires manual PNG generation or use of tools like:
 * - https://realfavicongenerator.net
 * - Inkscape CLI: inkscape -w 32 -h 32 favicon.svg -o favicon-32x32.png
 * - ImageMagick: convert -background none favicon.svg -resize 32x32 favicon-32x32.png
 * 
 * Required favicon sizes for full compatibility:
 * - favicon.ico (16x16, 32x32, 48x48 multi-resolution)
 * - favicon-16x16.png
 * - favicon-32x32.png
 * - apple-touch-icon.png (180x180)
 * - android-chrome-192x192.png
 * - android-chrome-512x512.png
 * - mstile-150x150.png (Windows tiles)
 */

const fs = require('fs');
const path = require('path');

// Web manifest for PWA support
const webManifest = {
    "name": "Abakada",
    "short_name": "Abakada",
    "description": "1000+ Free Open Source Productivity Tools for Filipino Students & Educators",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#107f87",
    "icons": [
        {
            "src": "/assets/logo/android-chrome-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/assets/logo/android-chrome-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
};

// Browser config for Windows tiles
const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/assets/logo/mstile-150x150.png"/>
            <TileColor>#107f87</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;

// Write web manifest
fs.writeFileSync(
    path.join(__dirname, '..', 'site.webmanifest'),
    JSON.stringify(webManifest, null, 2)
);
console.log('Created site.webmanifest');

// Write browser config
fs.writeFileSync(
    path.join(__dirname, '..', 'browserconfig.xml'),
    browserConfig
);
console.log('Created browserconfig.xml');

console.log('\n⚠️  PNG favicons must be generated manually from favicon.svg');
console.log('Required files in assets/logo/:');
console.log('  - favicon.ico (multi-resolution: 16, 32, 48)');
console.log('  - favicon-16x16.png');
console.log('  - favicon-32x32.png');
console.log('  - apple-touch-icon.png (180x180)');
console.log('  - android-chrome-192x192.png');
console.log('  - android-chrome-512x512.png');
console.log('  - mstile-150x150.png');
console.log('\nUse https://realfavicongenerator.net for easy generation');
