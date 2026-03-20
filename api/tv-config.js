import { readTvConfig } from "./_tv-config.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    const config = await readTvConfig();
    return response.status(200).json(config);
  } catch (error) {
    return response.status(500).json({
      error: error && error.message ? error.message : "Falha ao carregar configuracao"
    });
  }
}
