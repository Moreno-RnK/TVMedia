import { isAuthorized, normalizeTvConfig, readTvConfig, saveTvConfig } from "./_tv-config.js";

export default async function handler(request, response) {
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

  if (request.method === "GET") {
    try {
      const config = await readTvConfig();
      return response.status(200).json(config);
    } catch (error) {
      return response.status(500).json({
        error: error && error.message ? error.message : "Falha ao carregar configuracao"
      });
    }
  }

  if (request.method === "POST") {
    try {
      const config = normalizeTvConfig(request.body);
      const savedConfig = await saveTvConfig(config);
      return response.status(200).json(savedConfig);
    } catch (error) {
      return response.status(500).json({
        error: error && error.message ? error.message : "Falha ao salvar configuracao"
      });
    }
  }

  response.setHeader("Allow", "GET, POST");
  return response.status(405).json({ error: "Metodo nao permitido" });
}
