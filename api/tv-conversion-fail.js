import { updateDeviceConfig } from "./_tv-config.js";
import { isAgentAuthorized, readConversionJobs, saveConversionJobs } from "./_tv-conversion-jobs.js";

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
    const message = String(body.message || "Falha na conversao").trim();

    if (!jobId) {
      return response.status(400).json({ error: "jobId obrigatorio" });
    }

    const jobs = await readConversionJobs();
    const job = jobs.find((item) => item.id === jobId);

    if (!job) {
      return response.status(404).json({ error: "Tarefa nao encontrada" });
    }

    await updateDeviceConfig(job.deviceId, (device) => ({
      ...device,
      conversionStatus: "failed",
      conversionError: message,
      conversionJobId: "",
      conversionOriginalUrl: ""
    }));

    const nextJobs = jobs.map((item) => item.id === jobId
      ? {
          ...item,
          status: "failed",
          failedAt: new Date().toISOString(),
          error: message
        }
      : item);

    await saveConversionJobs(nextJobs);

    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(500).json({
      error: error && error.message ? error.message : "Falha ao registrar erro"
    });
  }
}
