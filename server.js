const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Route /api/* requests to the matching handler in /api/
  if (pathname.startsWith("/api/")) {
    const routeName = pathname.replace("/api/", "").replace(/[^a-zA-Z0-9_-]/g, "");
    const handlerPath = path.join(__dirname, "api", `${routeName}.js`);

    if (!fs.existsSync(handlerPath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "API route not found" }));
    }

    let rawBody = "";
    req.on("data", (chunk) => {
      rawBody += chunk;
    });

    req.on("end", async () => {
      req.query = Object.fromEntries(parsedUrl.searchParams.entries());
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        req.body = {};
      }

      // Helper methods to match Vercel's (req, res) API
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      };

      const handler = require(handlerPath);
      return handler(req, res);
    });
    return;
  }

  // Serve static frontend files
  let filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("404 Not Found");
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`EduAssess running at http://localhost:${PORT}`);
});
