import { isAuthorized, readTvConfig, updateDeviceConfig } from "./_tv-config.js";
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
    const jobType = String(body.jobType || "convert_single").trim();
    const originalUrl = String(body.originalUrl || "").trim();
    const originalName = String(body.originalName || "video.mp4").trim();

    if (!deviceId) {
      return response.status(400).json({ error: "deviceId e obrigatorio" });
    }

    const config = await readTvConfig();
    const device = config.devices && config.devices[deviceId];
    if (!device) {
      return response.status(404).json({ error: "TV nao encontrada" });
    }

    let jobPayload = {
      type: jobType
    };

    if (jobType === "render_playlist") {
      const playlist = Array.isArray(device.playlist) ? device.playlist : [];
      if (!playlist.length) {
        return response.status(400).json({ error: "A playlist desta TV esta vazia" });
      }

      jobPayload.playlist = playlist.map((item) => ({
        id: item.id || "",
        name: item.name || "",
        type: item.type || "image",
        url: item.url || "",
        poster: item.poster || "",
        durationSeconds: Number(item.durationSeconds || 8) || 8
      }));
    } else {
      if (!originalUrl) {
        return response.status(400).json({ error: "originalUrl e obrigatorio para videos avulsos" });
      }

      jobPayload.originalUrl = originalUrl;
      jobPayload.originalName = originalName;
    }

    const jobs = await readConversionJobs();
    const filteredJobs = jobs.filter((item) => {
      if (item.deviceId !== deviceId) {
        return true;
      }

      if (item.status !== "pending" && item.status !== "processing") {
        return true;
      }

      return item.type !== jobType;
    });

    const job = {
      id: "job-" + Date.now(),
      deviceId,
      ...jobPayload,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    filteredJobs.push(job);
    await saveConversionJobs(filteredJobs);

    await updateDeviceConfig(deviceId, (device) => {
      const next = {
        ...device,
        conversionStatus: "pending",
        conversionJobId: job.id,
        conversionOriginalUrl: jobType === "render_playlist" ? "" : originalUrl
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
