import { del } from "@vercel/blob";
import { isAuthorized } from "./_tv-config.js";

function getBody(request) {
  if (request.body) {
    return Promise.resolve(request.body);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function isBlobUrl(url) {
  return /\.public\.blob\.vercel-storage\.com/i.test(String(url || ""));
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    if (!isAuthorized(request)) {
      response.setHeader("WWW-Authenticate", 'Bearer realm="tv-admin"');
      return response.status(401).json({ error: "Nao autorizado" });
    }
  } catch (error) {
    return response.status(500).json({
      error: error && error.message ? error.message : "Falha de configuracao"
    });
  }

  try {
    const body = await getBody(request);
    const url = body && body.url ? String(body.url) : "";

    if (!url) {
      return response.status(400).json({ error: "URL obrigatoria" });
    }

    if (!isBlobUrl(url)) {
      return response.status(200).json({ deleted: false, skipped: true });
    }

    await del(url);
    return response.status(200).json({ deleted: true });
  } catch (error) {
    return response.status(400).json({
      error: error && error.message ? error.message : "Falha ao excluir midia"
    });
  }
}
