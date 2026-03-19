import { isAuthorized, updateDeviceConfig } from "./_tv-config.js";
import { readConversionJobs, saveConversionJobs } from "./_tv-conversion-jobs.js";

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

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    const body = request.body || {};
    const deviceId = String(body.deviceId || "").trim();
    const originalUrl = String(body.originalUrl || "").trim();
    const originalName = String(body.originalName || "video.mp4").trim();

    if (!deviceId || !originalUrl) {
      return response.status(400).json({ error: "deviceId e originalUrl sao obrigatorios" });
    }

    const jobs = await readConversionJobs();
    const job = {
      id: "job-" + Date.now(),
      deviceId,
      originalUrl,
      originalName,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    jobs.push(job);
    await saveConversionJobs(jobs);

    await updateDeviceConfig(deviceId, (device) => {
      const next = {
        ...device,
        conversionStatus: "pending",
        conversionJobId: job.id,
        conversionOriginalUrl: originalUrl
      };
      return next;
    });

    return response.status(200).json(job);
  } catch (error) {
    return response.status(500).json({
      error: error && error.message ? error.message : "Falha ao criar tarefa de conversao"
    });
  }
}
