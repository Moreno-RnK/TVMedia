import { handleUpload } from "@vercel/blob/client";
import { isAuthorized } from "./_tv-config.js";

function getBody(request) {
  if (request.body) {
    return request.body;
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
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const expectedPassword = process.env.TV_ADMIN_PASSWORD;
        const payloadPassword = clientPayload ? String(clientPayload) : "";

        if (!isAuthorized(request) && payloadPassword !== expectedPassword) {
          throw new Error("Nao autorizado");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm"
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname: pathname })
        };
      },
      onUploadCompleted: async () => {
        return;
      }
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({
      error: error && error.message ? error.message : "Falha no upload"
    });
  }
}
