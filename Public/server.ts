import { file } from "bun";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const PORT = 3000;
const PUBLIC_DIR = "./Public";

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

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;

        if (path === "/" || path === "/index.html") {
            return new Response(await file(`${PUBLIC_DIR}/index.html`).text(), {
                headers: { "Content-Type": "text/html" }
            });
        }

        if (path === "/Global.css") {
            return new Response(await file("./Global.css").text(), {
                headers: { "Content-Type": "text/css" }
            });
        }

        if (path === "/manifest.json") {
            return new Response(await file(`${PUBLIC_DIR}/manifest.json`).text(), {
                headers: { "Content-Type": "application/json" }
            });
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

        return new Response("Not Found", { status: 404 });
    }
});

async function handleSystemStats(): Promise<Response> {
    try {
        const stats: SystemStats = {
            uptime: await getUptime(),
            temperature: await getTemperature(),
            cpuUsage: await getCpuUsage(),
            memoryUsage: await getMemoryUsage(),
            diskUsage: await getDiskUsage()
        };

        return new Response(JSON.stringify(stats), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch system stats" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

async function handleSystemCommand(req: Request): Promise<Response> {
    try {
        const body = await req.json() as { command: string };
        const { command } = body;

        if (!["restart", "stop", "start"].includes(command)) {
            return new Response(JSON.stringify({ error: "Invalid command" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        await executeSystemCommand(command);

        return new Response(JSON.stringify({ success: true, command }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to execute command" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

async function handlePackagesList(): Promise<Response> {
    try {
        const packages = await getInstalledPackages();

        return new Response(JSON.stringify(packages), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch packages" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

async function handlePackageInstall(req: Request): Promise<Response> {
    try {
        const body = await req.json() as { packageName: string };
        const { packageName } = body;

        await installPackage(packageName);

        return new Response(JSON.stringify({ success: true, package: packageName }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to install package" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

async function handlePackageUninstall(req: Request): Promise<Response> {
    try {
        const body = await req.json() as { packageName: string };
        const { packageName } = body;

        await uninstallPackage(packageName);

        return new Response(JSON.stringify({ success: true, package: packageName }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to uninstall package" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

async function handleServicesList(): Promise<Response> {
    try {
        const services = await getRunningServices();

        return new Response(JSON.stringify(services), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch services" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

async function getUptime(): Promise<string> {
    try {
        const { stdout } = await execAsync("uptime -p");
        return stdout.trim();
    } catch {
        return "N/A";
    }
}

async function getTemperature(): Promise<string> {
    try {
        const { stdout } = await execAsync("cat /sys/class/thermal/thermal_zone0/temp");
        const temp = parseInt(stdout.trim()) / 1000;
        return `${temp.toFixed(1)}°C`;
    } catch {
        return "N/A";
    }
}

async function getCpuUsage(): Promise<string> {
    try {
        const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
        return `${stdout.trim()}%`;
    } catch {
        return "N/A";
    }
}

async function getMemoryUsage(): Promise<string> {
    try {
        const { stdout } = await execAsync("free -m | awk 'NR==2{printf \"%s/%sMB (%.1f%%)\", $3,$2,$3*100/$2 }'");
        return stdout.trim();
    } catch {
        return "N/A";
    }
}

async function getDiskUsage(): Promise<string> {
    try {
        const { stdout } = await execAsync("df -h / | awk 'NR==2{printf \"%s/%s (%s)\", $3,$2,$5}'");
        return stdout.trim();
    } catch {
        return "N/A";
    }
}

async function executeSystemCommand(command: string): Promise<void> {
    const commands: Record<string, string> = {
        restart: "systemctl restart samsara-hub",
        stop: "systemctl stop samsara-hub",
        start: "systemctl start samsara-hub"
    };

    const cmd = commands[command];
    if (cmd) {
        await execAsync(cmd);
    }
}

async function getInstalledPackages(): Promise<PackageInfo[]> {
    try {
        const { stdout } = await execAsync("dpkg -l | awk 'NR>5 {print $2,$3}'");
        const lines = stdout.trim().split("\n");

        return lines.map(line => {
            const [name, version] = line.split(" ");
            return {
                name: name ?? "",
                version: version ?? "",
                description: "",
                installed: true
            };
        }).slice(0, 50);
    } catch {
        return [];
    }
}

async function installPackage(packageName: string): Promise<void> {
    await execAsync(`apt-get install -y ${packageName}`);
}

async function uninstallPackage(packageName: string): Promise<void> {
    await execAsync(`apt-get remove -y ${packageName}`);
}

async function getRunningServices(): Promise<string[]> {
    try {
        const { stdout } = await execAsync("systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print $1}'");
        return stdout.trim().split("\n").slice(0, 20);
    } catch {
        return [];
    }
}

console.log(`Server running at http://localhost:${PORT}`);