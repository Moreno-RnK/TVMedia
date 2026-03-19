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
    const jobs = await readConversionJobs();
    let claimedJob = null;
    const nextJobs = jobs.map((job) => {
      if (!claimedJob && job.status === "pending") {
        claimedJob = {
          ...job,
          status: "processing",
          claimedAt: new Date().toISOString()
        };
        return claimedJob;
      }
      return job;
    });

    if (claimedJob) {
      await saveConversionJobs(nextJobs);
      return response.status(200).json({ job: claimedJob });
    }

    return response.status(200).json({ job: null });
  } catch (error) {
    return response.status(500).json({
      error: error && error.message ? error.message : "Falha ao consultar fila"
    });
  }
}
