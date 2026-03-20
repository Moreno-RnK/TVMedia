import { list, put } from "@vercel/blob";

const JOBS_PATH = "tv/conversion-jobs.json";

export async function readConversionJobs() {
  const result = await list({ prefix: JOBS_PATH, limit: 1 });
  const blob = Array.isArray(result && result.blobs) ? result.blobs[0] : null;

  if (!blob || !blob.url) {
    return [];
  }
  try {
    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : Array.isArray(data && data.jobs) ? data.jobs : [];
  } catch (error) {
    return [];
  }
}

export async function saveConversionJobs(jobs) {
  await put(JOBS_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    jobs: Array.isArray(jobs) ? jobs : []
  }, null, 2), {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8"
  });
}

export function isAgentAuthorized(request) {
  const expectedToken = process.env.CONVERTER_AGENT_TOKEN;
  if (!expectedToken) {
    throw new Error("CONVERTER_AGENT_TOKEN nao configurado no Vercel");
  }

  const authHeader = request.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return token && token === expectedToken;
}
