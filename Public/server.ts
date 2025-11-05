import { file } from "bun";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const PUBLIC_DIR = "./Public";

type Platform = "termux" | "alpine" | "linux";

interface PlatformConfig {
  platform: Platform;
  prefix: string;
  packageManager: string;
  serviceManager: string;
}

const platformConfig: PlatformConfig = detectPlatform();

interface SystemStats {
  uptime: string;
  temperature: string;
  cpuUsage: string;
  memoryUsage: string;
  diskUsage: string;
}

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  installed: boolean;
}

const STATIC_ASSETS: Record<string, { location: string; type: string }> = {
  "/Global.css": { location: "./Global.css", type: "text/css" },
  "/index.js": {
    location: `${PUBLIC_DIR}/index.js`,
    type: "application/javascript",
  },
  "/WebUi.svg": { location: "./WebUi.svg", type: "image/svg+xml" },
};

function getMimeType(pathname: string): string {
  if (pathname.endsWith(".css")) {
    return "text/css";
  }
  if (pathname.endsWith(".js")) {
    return "application/javascript";
  }
  if (pathname.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (pathname.endsWith(".html")) {
    return "text/html";
  }
  if (pathname.endsWith(".json")) {
    return "application/json";
  }
  return "application/octet-stream";
}

function detectPlatform(): PlatformConfig {
  const platformEnv = Bun.env.SAMSARA_PLATFORM;
  const prefix = Bun.env.SAMSARA_PREFIX ?? "/usr";

  if (platformEnv === "termux" || Bun.env.TERMUX_VERSION) {
    return {
      platform: "termux",
      prefix: prefix,
      packageManager: "pkg",
      serviceManager: "termux-services",
    };
  }

  try {
    const alpineRelease = Bun.file("/etc/alpine-release");
    if (alpineRelease.size > 0) {
      return {
        platform: "alpine",
        prefix: prefix,
        packageManager: "apk",
        serviceManager: "rc-service",
      };
    }
  } catch {}

  return {
    platform: "linux",
    prefix: prefix,
    packageManager: "apt-get",
    serviceManager: "systemctl",
  };
}

function getBasePort(): number {
  const fromEnv = Bun.env.SAMSARA_PORT ?? Bun.env.PORT;
  if (fromEnv) {
    const parsed = Number.parseInt(fromEnv, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
  }
  return 3000;
}

function buildPortSequence(): number[] {
  const base = getBasePort();
  const attempts = getPortAttemptCount();
  return Array.from({ length: attempts }, (_, index) => base + index);
}

function getPortAttemptCount(): number {
  const fromEnv = Bun.env.SAMSARA_PORT_ATTEMPTS;
  if (fromEnv) {
    const parsed = Number.parseInt(fromEnv, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, 50);
    }
  }
  return 5;
}

function isAddressInUse(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if (!("code" in error)) {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === "EADDRINUSE";
}

function startServer(): ReturnType<typeof Bun.serve> {
  const candidates = buildPortSequence();
  for (const port of candidates) {
    try {
      return Bun.serve({
        port,
        async fetch(req) {
          const url = new URL(req.url);
          const path = url.pathname;

          if (path === "/" || path === "/index.html") {
            return new Response(await file(`${PUBLIC_DIR}/index.html`).text(), {
              headers: { "Content-Type": "text/html" },
            });
          }

          if (path === "/docs") {
            return new Response(await file(`${PUBLIC_DIR}/docs.html`).text(), {
              headers: { "Content-Type": "text/html" },
            });
          }

          if (path === "/forums") {
            return new Response(
              await file(`${PUBLIC_DIR}/forums.html`).text(),
              {
                headers: { "Content-Type": "text/html" },
              },
            );
          }

          if (path === "/favicon.ico") {
            return new Response(null, { status: 204 });
          }

          if (path === "/api/system/stats") {
            return await handleSystemStats();
          }

          if (path === "/api/system/command" && req.method === "POST") {
            return await handleSystemCommand(req);
          }

          if (path === "/api/packages/list") {
            return await handlePackagesList();
          }

          if (path === "/api/packages/install" && req.method === "POST") {
            return await handlePackageInstall(req);
          }

          if (path === "/api/packages/uninstall" && req.method === "POST") {
            return await handlePackageUninstall(req);
          }

          if (path === "/api/services/list") {
            return await handleServicesList();
          }

          const staticAsset = await serveStaticAsset(path);
          if (staticAsset) {
            return staticAsset;
          }

          return new Response("Not Found", { status: 404 });
        },
      });
    } catch (error) {
      if (!isAddressInUse(error)) {
        throw error;
      }
    }
  }
  throw new Error("All candidate ports are currently in use");
}

const server = startServer();

async function serveStaticAsset(pathname: string): Promise<Response | null> {
  const direct = STATIC_ASSETS[pathname];
  if (direct) {
    const asset = Bun.file(direct.location);
    if (await asset.exists()) {
      return new Response(asset, {
        headers: { "Content-Type": direct.type },
      });
    }
  }

  if (pathname.includes("..")) {
    return null;
  }

  const candidate = Bun.file(`${PUBLIC_DIR}${pathname}`);
  if (await candidate.exists()) {
    return new Response(candidate, {
      headers: { "Content-Type": getMimeType(pathname) },
    });
  }

  return null;
}

async function handleSystemStats(): Promise<Response> {
  try {
    const stats: SystemStats = {
      uptime: await getUptime(),
      temperature: await getTemperature(),
      cpuUsage: await getCpuUsage(),
      memoryUsage: await getMemoryUsage(),
      diskUsage: await getDiskUsage(),
    };

    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch system stats:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch system stats" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function handleSystemCommand(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { command: string };
    const { command } = body;

    if (!["restart", "stop", "start"].includes(command)) {
      return new Response(JSON.stringify({ error: "Invalid command" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await executeSystemCommand(command);

    return new Response(JSON.stringify({ success: true, command }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to execute command:", error);
    return new Response(
      JSON.stringify({ error: "Failed to execute command" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function handlePackagesList(): Promise<Response> {
  try {
    const packages = await getInstalledPackages();

    return new Response(JSON.stringify(packages), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch packages" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handlePackageInstall(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { packageName: string };
    const { packageName } = body;

    await installPackage(packageName);

    return new Response(
      JSON.stringify({ success: true, package: packageName }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Failed to install package:", error);
    return new Response(
      JSON.stringify({ error: "Failed to install package" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function handlePackageUninstall(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { packageName: string };
    const { packageName } = body;

    await uninstallPackage(packageName);

    return new Response(
      JSON.stringify({ success: true, package: packageName }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Failed to uninstall package:", error);
    return new Response(
      JSON.stringify({ error: "Failed to uninstall package" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function handleServicesList(): Promise<Response> {
  try {
    const services = await getRunningServices();

    return new Response(JSON.stringify(services), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch services" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function getUptime(): Promise<string> {
  try {
    if (platformConfig.platform === "termux") {
      const { stdout } = await execAsync("uptime");
      return stdout.trim();
    }
    if (platformConfig.platform === "alpine") {
      const { stdout } = await execAsync("uptime");
      return stdout.trim();
    }
    const { stdout } = await execAsync("uptime -p");
    return stdout.trim();
  } catch {
    return "N/A";
  }
}

async function getTemperature(): Promise<string> {
  try {
    if (platformConfig.platform === "termux") {
      const { stdout } = await execAsync(
        "termux-battery-status | grep temperature | awk '{print $2}'",
      );
      return `${stdout.trim()}C`;
    }
    const { stdout } = await execAsync(
      "cat /sys/class/thermal/thermal_zone0/temp",
    );
    const temp = Number.parseInt(stdout.trim(), 10) / 1000;
    return `${temp.toFixed(1)}C`;
  } catch {
    return "N/A";
  }
}

async function getCpuUsage(): Promise<string> {
  try {
    if (platformConfig.platform === "alpine") {
      const { stdout } = await execAsync(
        "top -bn1 | grep 'CPU:' | awk '{print $2}'",
      );
      return stdout.trim();
    }
    if (platformConfig.platform === "termux") {
      const { stdout } = await execAsync(
        "top -bn1 | head -3 | grep -i cpu | awk '{print $2}'",
      );
      return stdout.trim();
    }
    const { stdout } = await execAsync(
      "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'",
    );
    return `${stdout.trim()}%`;
  } catch {
    return "N/A";
  }
}

async function getMemoryUsage(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      "free -m | awk 'NR==2{printf \"%s/%sMB (%.1f%%)\", $3,$2,$3*100/$2 }'",
    );
    return stdout.trim();
  } catch {
    return "N/A";
  }
}

async function getDiskUsage(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      "df -h / | awk 'NR==2{printf \"%s/%s (%s)\", $3,$2,$5}'",
    );
    return stdout.trim();
  } catch {
    return "N/A";
  }
}

async function executeSystemCommand(command: string): Promise<void> {
  let cmd: string | undefined;

  if (platformConfig.platform === "termux") {
    const termuxCommands: Record<string, string> = {
      restart: "echo 'Restart command received'",
      stop: "echo 'Stop command received'",
      start: "echo 'Start command received'",
    };
    cmd = termuxCommands[command];
  } else if (platformConfig.platform === "alpine") {
    const alpineCommands: Record<string, string> = {
      restart: "echo 'Restart command received'",
      stop: "echo 'Stop command received'",
      start: "echo 'Start command received'",
    };
    cmd = alpineCommands[command];
  } else {
    const systemdCommands: Record<string, string> = {
      restart: "echo 'Restart command received'",
      stop: "echo 'Stop command received'",
      start: "echo 'Start command received'",
    };
    cmd = systemdCommands[command];
  }

  if (cmd) {
    await execAsync(cmd);
    console.log(`Command executed: ${command}`);
  }
}

async function getInstalledPackages(): Promise<PackageInfo[]> {
  try {
    let stdout: string;

    if (platformConfig.platform === "termux") {
      const result = await execAsync(
        "pkg list-installed 2>/dev/null | awk -F'/' '{print $1}'",
      );
      stdout = result.stdout;
    } else if (platformConfig.platform === "alpine") {
      const result = await execAsync("apk info | head -50");
      stdout = result.stdout;
    } else {
      const result = await execAsync("dpkg -l | awk 'NR>5 {print $2,$3}'");
      stdout = result.stdout;
    }

    const lines = stdout.trim().split("\n");

    if (
      platformConfig.platform === "alpine" ||
      platformConfig.platform === "termux"
    ) {
      return lines
        .map((line) => ({
          name: line.trim(),
          version: "",
          description: "",
          installed: true,
        }))
        .slice(0, 50);
    }

    return lines
      .map((line) => {
        const [name, version] = line.split(" ");
        return {
          name: name ?? "",
          version: version ?? "",
          description: "",
          installed: true,
        };
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

async function installPackage(packageName: string): Promise<void> {
  if (platformConfig.platform === "termux") {
    await execAsync(`pkg install -y ${packageName}`);
  } else if (platformConfig.platform === "alpine") {
    await execAsync(`apk add ${packageName}`);
  } else {
    await execAsync(`apt-get install -y ${packageName}`);
  }
}

async function uninstallPackage(packageName: string): Promise<void> {
  if (platformConfig.platform === "termux") {
    await execAsync(`pkg uninstall -y ${packageName}`);
  } else if (platformConfig.platform === "alpine") {
    await execAsync(`apk del ${packageName}`);
  } else {
    await execAsync(`apt-get remove -y ${packageName}`);
  }
}

async function getRunningServices(): Promise<string[]> {
  try {
    let stdout: string;

    if (platformConfig.platform === "termux") {
      const result = await execAsync(
        "ps aux | awk 'NR>1 {print $11}' | sort -u",
      );
      stdout = result.stdout;
    } else if (platformConfig.platform === "alpine") {
      const result = await execAsync(
        "rc-status -s 2>/dev/null || ps aux | awk 'NR>1 {print $11}' | sort -u",
      );
      stdout = result.stdout;
    } else {
      const result = await execAsync(
        "systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print $1}'",
      );
      stdout = result.stdout;
    }

    return stdout.trim().split("\n").slice(0, 20);
  } catch {
    return [];
  }
}

console.log(`Server running at http://localhost:${server.port}`);
