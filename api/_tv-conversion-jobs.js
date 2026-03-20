import { list, put } from "@vercel/blob";

const JOBS_PATH = "tv/conversion-jobs.json";

export async function readConversionJobs() {
  const { blobs } = await list({ prefix: JOBS_PATH, limit: 20 });
  const candidates = Array.isArray(blobs) ? blobs.filter((blob) => blob && blob.url) : [];

  if (!candidates.length) {
    return [];
  }

  const loaded = await Promise.all(candidates.map(async (blob) => {
    try {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const jobs = Array.isArray(data) ? data : Array.isArray(data && data.jobs) ? data.jobs : null;
      if (!jobs) {
        return null;
      }

      const stamp = new Date(
        (data && data.updatedAt) ||
        blob.uploadedAt ||
        blob.createdAt ||
        0
      ).getTime();

      return {
        stamp,
        jobs
      };
    } catch (error) {
      return null;
    }
  }));

  const valid = loaded.filter(Boolean).sort((left, right) => right.stamp - left.stamp);
  return valid.length ? valid[0].jobs : [];
}

export async function saveConversionJobs(jobs) {
  await put(JOBS_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    jobs: Array.isArray(jobs) ? jobs : []
  }, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
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
