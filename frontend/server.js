import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

const server = http.createServer((req, res) => {
  // Obtenemos la ruta del archivo solicitado
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Limpiamos parámetros de búsqueda de la URL (ej: ?v=123)
  const questionMarkIdx = filePath.indexOf('?');
  if (questionMarkIdx !== -1) {
    filePath = filePath.substring(0, questionMarkIdx);
  }

  const extName = path.extname(filePath).toLowerCase();
  
  // Si no tiene extensión, asumimos que es una ruta SPA y servimos el index.html
  if (!extName) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const currentExt = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[currentExt] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Si el archivo solicitado no existe, redireccionamos a index.html (Soporte SPA)
      fs.readFile(path.join(DIST_DIR, 'index.html'), (errHtml, contentHtml) => {
        if (errHtml) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error interno del servidor');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(contentHtml, 'utf-8');
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AlumniCV Frontend escuchando en el puerto ${PORT} sobre todas las interfaces (0.0.0.0)`);
});
