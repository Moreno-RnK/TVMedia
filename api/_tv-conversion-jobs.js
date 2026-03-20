import { list, put } from "@vercel/blob";

const JOBS_PATH = "tv/conversion-jobs.json";

function pickLatestBlob(blobs) {
  if (!Array.isArray(blobs) || !blobs.length) {
    return null;
  }

  return blobs.slice().sort((left, right) => {
    const leftTime = new Date(left.uploadedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.uploadedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  })[0];
}

export async function readConversionJobs() {
  const { blobs } = await list({ prefix: JOBS_PATH, limit: 20 });
  const blob = pickLatestBlob(blobs);

  if (!blob || !blob.url) {
    return [];
  }

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Nao foi possivel ler a fila de conversao");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function saveConversionJobs(jobs) {
  await put(JOBS_PATH, JSON.stringify(Array.isArray(jobs) ? jobs : [], null, 2), {
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
