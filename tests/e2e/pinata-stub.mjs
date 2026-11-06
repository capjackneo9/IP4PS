// Local stand-in for Pinata and an IPFS gateway, for automated tests only. Never use in production.
import { createHash } from "node:crypto";
import http from "node:http";

const port = Number(process.argv[2] ?? 8098);
const store = new Map();
const cidOf = (buf) => "bafkstub" + createHash("sha256").update(buf).digest("hex").slice(0, 40);
const read = (req) => new Promise((res) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => res(Buffer.concat(c))); });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };

http
  .createServer(async (req, res) => {
    const send = (code, body, type = "application/json") => { res.writeHead(code, { "Content-Type": type, ...cors }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
    if (req.method === "OPTIONS") return send(204, "");
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/v3/files/sign") {
      if (!req.headers.authorization?.startsWith("Bearer ")) return send(401, { error: "no jwt" });
      return send(200, { data: `http://127.0.0.1:${port}/upload?sig=test` });
    }
    if (url.pathname === "/upload" && req.method === "POST") {
      const body = await read(req);
      // Take the bytes of the "file" part of the multipart body.
      const boundary = "--" + req.headers["content-type"].split("boundary=")[1];
      const parts = body.toString("latin1").split(boundary);
      const filePart = parts.find((p) => p.includes('name="file"'));
      const content = Buffer.from(filePart.slice(filePart.indexOf("\r\n\r\n") + 4, -2), "latin1");
      const cid = cidOf(content);
      store.set(cid, { content, type: (filePart.match(/Content-Type: (.*)\r\n/) || [])[1] ?? "application/octet-stream" });
      return send(200, { data: { id: cid, cid, size: content.length } });
    }
    if (url.pathname === "/pinning/pinJSONToIPFS" && req.method === "POST") {
      const { pinataContent } = JSON.parse((await read(req)).toString());
      const content = Buffer.from(JSON.stringify(pinataContent));
      const cid = cidOf(content);
      store.set(cid, { content, type: "application/json" });
      return send(200, { IpfsHash: cid });
    }
    const m = url.pathname.match(/^\/ipfs\/([^/]+)/);
    if (m && store.has(m[1])) { const f = store.get(m[1]); return send(200, f.content, f.type); }
    send(404, { error: "not found" });
  })
  .listen(port, "127.0.0.1", () => console.log(`pinata stub on ${port}`));
