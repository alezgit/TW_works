const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Assicurati che i certificati siano nella cartella 'certs'
const options = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem')
};

const server = https.createServer(options, (req, res) => {
  let filePath = '.' + req.url;
  
  // Se l'utente va sulla root, serve il file HTML principale
  if (filePath === './') {
    filePath = './MULTIMOD_presentation_without_AI_(202502858).html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  
  // LISTA TIPI FILE AGGIORNATA (Quelli con *** sono CRUCIALI per l'AR)
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    // *** AGGIUNTI PER FAR FUNZIONARE L'AR ***
    '.glb': 'model/gltf-binary',       // Fondamentale per Android/Web
    '.usdz': 'model/vnd.usdz+zip'      // FONDAMENTALE PER IOS (Senza questo, niente bottone AR)
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code == 'ENOENT') {
        console.log(`❌ File non trovato: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: '+error.code+' ..\n');
      }
    } else {
      // Logga cosa sta servendo per debug
      console.log(`✅ Serving: ${filePath} as ${contentType}`);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Funzione per ottenere l'IP locale
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = 3000;
const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🚀 HTTPS Server AGGIORNATO E ATTIVO!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📱 CONNECT FROM IPHONE:');
  console.log(`   https://${localIP}:${PORT}/\n`);
  
  console.log('⚠️  DA FARE ORA:');
  console.log('   1. Assicurati che il file .usdz sia linkato correttamente nell\'HTML');
  console.log('   2. Accetta il certificato di sicurezza sul telefono');
  console.log('═══════════════════════════════════════════════════════════════\n');
});