//creates a simple HTTP server functionality
const http = require('http');
//file system module to interact with the file system
const fs = require('fs');
//path module to work with file and directory paths
const path = require('path');
//importing Face3DBuilder class from 3d.js file
const Face3DBuilder = require('./3d.js');
//defining the port number for the server to listen on
const PORT = 3000;
// Object variable called mime types(Multipurpose Internet Mail Extensions)
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.obj': 'text/plain',
  '.mtl': 'text/plain'
};
console.log(mimeTypes)
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Default to viewer.html
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './viewer.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

async function startServer() {
  try {
    // Generate 3D face model before starting server
    console.log('🎭 Generating 3D face model...');
    const builder = new Face3DBuilder();
    await builder.build();
    console.log('');
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}/`);
      console.log(`📄 Serving viewer.html at http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error('❌ Error generating 3D model:', err);
    process.exit(1);
  }
}

startServer();
