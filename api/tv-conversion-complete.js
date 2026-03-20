import { del } from "@vercel/blob";
import { updateDeviceConfig } from "./_tv-config.js";
import { isAgentAuthorized, readConversionJobs, saveConversionJobs } from "./_tv-conversion-jobs.js";

function isBlobUrl(url) {
  return /\.public\.blob\.vercel-storage\.com/i.test(String(url || ""));
}

export default async function handler(request, response) {
  try {
    if (!isAgentAuthorized(request)) {
      response.setHeader("WWW-Authenticate", 'Bearer realm="converter-agent"');
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
    const jobId = String(body.jobId || "").trim();
    const convertedUrl = String(body.convertedUrl || "").trim();
    const version = String(body.version || Date.now()).trim();

    if (!jobId || !convertedUrl) {
      return response.status(400).json({ error: "jobId e convertedUrl sao obrigatorios" });
    }

    const jobs = await readConversionJobs();
    const job = jobs.find((item) => item.id === jobId);

    if (!job) {
      return response.status(404).json({ error: "Tarefa nao encontrada" });
    }

    await updateDeviceConfig(job.deviceId, (device) => ({
      ...device,
      media: {
        ...(device.media || {}),
        type: "video",
        url: convertedUrl,
        version
      },
      conversionStatus: "completed",
      conversionJobId: "",
      conversionOriginalUrl: ""
    }));

    const nextJobs = jobs.map((item) => item.id === jobId
      ? {
          ...item,
          status: "completed",
          completedAt: new Date().toISOString(),
          convertedUrl
        }
      : item);

    await saveConversionJobs(nextJobs);

    if (job.type !== "render_playlist" && job.originalUrl && isBlobUrl(job.originalUrl)) {
      del(job.originalUrl).catch(() => {});
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(500).json({
      error: error && error.message ? error.message : "Falha ao finalizar conversao"
    });
  }
}
