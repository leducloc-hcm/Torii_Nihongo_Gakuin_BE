import { UAParser } from "ua-parser-js";

export interface ParsedDeviceInfo {
  deviceName: string;
  browserName: string;
  osName: string;
}

export function parseDeviceInfo(userAgent: string): ParsedDeviceInfo {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const browserName =
    [browser.name, browser.version?.split(".")[0]].filter(Boolean).join(" ") ||
    "Unknown Browser";

  const osName =
    [os.name, os.version].filter(Boolean).join(" ") || "Unknown OS";

  let deviceName = "Desktop";
  if (device.type === "mobile") deviceName = device.model || "Mobile";
  else if (device.type === "tablet") deviceName = device.model || "Tablet";
  else if (device.vendor) deviceName = device.vendor;

  return { deviceName, browserName, osName };
}

export async function getLocationFromIp(ip: string): Promise<string | null> {
  // Skip for private/local IPs
  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
    ip === "localhost"
  ) {
    return "Local Network";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,regionName,city,country`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== "success") return null;

    return (
      [data.city, data.regionName, data.country].filter(Boolean).join(", ") ||
      null
    );
  } catch {
    return null;
  }
}
