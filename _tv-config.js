import { list, put } from "@vercel/blob";

const CONFIG_PATH = "tv/config.json";

export function defaultTvConfig() {
  return {
    devices: {
      default: {
        name: "TV Padrao",
        deviceType: "tv",
        label: "Conteudo padrao",
        media: {
          type: "video",
          url: "",
          version: "1",
          poster: ""
        }
      }
    }
  };
}

export async function readTvConfig() {
  const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });
  const blob = blobs && blobs[0];

  if (!blob || !blob.url) {
    return defaultTvConfig();
  }

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Nao foi possivel ler a configuracao das TVs");
  }

  const data = await response.json();
  if (!data || typeof data !== "object") {
    return defaultTvConfig();
  }

  if (data.devices && typeof data.devices === "object") {
    return data;
  }

  return { devices: data };
}

export async function saveTvConfig(config) {
  const normalized = normalizeTvConfig(config);
  await put(CONFIG_PATH, JSON.stringify(normalized, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8"
  });
  return normalized;
}

export async function updateDeviceConfig(deviceId, updater) {
  const config = await readTvConfig();
  const devices = config.devices && typeof config.devices === "object" ? config.devices : {};
  const currentDevice = devices[deviceId] && typeof devices[deviceId] === "object"
    ? devices[deviceId]
    : {
        name: deviceId,
        deviceType: "tv",
        label: deviceId,
        media: {
          type: "video",
          url: "",
          version: "1",
          poster: ""
        }
      };

  const updatedDevice = updater(currentDevice) || currentDevice;
  devices[deviceId] = updatedDevice;
  config.devices = devices;
  await saveTvConfig(config);
  return config;
}

export function normalizeTvConfig(input) {
  const base = input && typeof input === "object" ? input : {};
  const devices = base.devices && typeof base.devices === "object" ? base.devices : {};
  return { devices };
}

export function isAuthorized(request) {
  const expectedPassword = process.env.TV_ADMIN_PASSWORD;
  if (!expectedPassword) {
    throw new Error("TV_ADMIN_PASSWORD nao configurado no Vercel");
  }

  const authHeader = request.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token && token === expectedPassword) {
    return true;
  }

  const cookieHeader = request.headers.cookie || "";
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)tv_admin_password=([^;]+)/);
  const cookiePassword = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";

  return cookiePassword && cookiePassword === expectedPassword;
}
