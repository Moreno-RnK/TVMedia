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
        },
        playlist: []
      }
    }
  };
}

export async function readTvConfig() {
  const { blobs } = await list({ prefix: CONFIG_PATH, limit: 20 });
  const candidates = Array.isArray(blobs) ? blobs.filter((blob) => blob && blob.url) : [];

  if (!candidates.length) {
    return defaultTvConfig();
  }

  const loaded = await Promise.all(candidates.map(async (blob) => {
    try {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data || typeof data !== "object") {
        return null;
      }

      const wrapped = data.devices && typeof data.devices === "object" ? data : { devices: data };
      const stamp = new Date(
        (wrapped._meta && wrapped._meta.updatedAt) ||
        blob.uploadedAt ||
        blob.createdAt ||
        0
      ).getTime();

      return {
        stamp,
        data: wrapped
      };
    } catch (error) {
      return null;
    }
  }));

  const valid = loaded.filter(Boolean).sort((left, right) => right.stamp - left.stamp);
  if (!valid.length) {
    return defaultTvConfig();
  }

  return valid[0].data;
}

export async function saveTvConfig(config) {
  const normalized = normalizeTvConfig(config);
  normalized._meta = {
    ...(normalized._meta && typeof normalized._meta === "object" ? normalized._meta : {}),
    updatedAt: new Date().toISOString()
  };
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
        },
        playlist: []
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
  const normalizedDevices = {};

  Object.keys(devices).forEach((deviceId) => {
    const device = devices[deviceId] && typeof devices[deviceId] === "object" ? devices[deviceId] : {};
    const media = device.media && typeof device.media === "object"
      ? device.media
      : {
          type: "video",
          url: "",
          version: "1",
          poster: ""
        };
    const playlist = Array.isArray(device.playlist)
      ? device.playlist.map((item) => {
          const safeItem = item && typeof item === "object" ? item : {};
          return {
            id: safeItem.id || "",
            name: safeItem.name || "",
            type: safeItem.type || "image",
            url: safeItem.url || "",
            poster: safeItem.poster || "",
            durationSeconds: Number(safeItem.durationSeconds || 8) || 8
          };
        })
      : [];

    normalizedDevices[deviceId] = {
      ...device,
      media,
      playlist
    };
  });

  return { devices: normalizedDevices };
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
