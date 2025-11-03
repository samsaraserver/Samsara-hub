const metricValues = {
	cpu: document.querySelector('[data-metric-value="cpu"]'),
	memory: document.querySelector('[data-metric-value="memory"]'),
	temperature: document.querySelector('[data-metric-value="temperature"]'),
	storage: document.querySelector('[data-metric-value="storage"]')
};

const progressBars = {
	cpu: document.querySelector('[data-progress="cpu"]'),
	memory: document.querySelector('[data-progress="memory"]'),
	temperature: document.querySelector('[data-progress="temperature"]'),
	storage: document.querySelector('[data-progress="storage"]')
};

const infoSlots = {
	uptime: document.querySelector('[data-info="uptime"]')
};

const notificationHost = document.createElement("div");
notificationHost.style.position = "fixed";
notificationHost.style.top = "1.5rem";
notificationHost.style.right = "1.5rem";
notificationHost.style.padding = "0.75rem 1.25rem";
notificationHost.style.borderRadius = "8px";
notificationHost.style.background = "#21262d";
notificationHost.style.color = "#e6edf3";
notificationHost.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.35)";
notificationHost.style.opacity = "0";
notificationHost.style.transform = "translateY(-10px)";
notificationHost.style.transition = "opacity 0.2s ease, transform 0.2s ease";
notificationHost.style.pointerEvents = "none";
document.body.appendChild(notificationHost);

function showNotification(message, tone) {
	notificationHost.textContent = message;
	notificationHost.style.background = tone === "error" ? "#2f1516" : "#21262d";
	notificationHost.style.border = tone === "error" ? "1px solid #f85149" : "1px solid #30363d";
	notificationHost.style.opacity = "1";
	notificationHost.style.transform = "translateY(0)";
	setTimeout(() => {
		notificationHost.style.opacity = "0";
		notificationHost.style.transform = "translateY(-10px)";
	}, 2200);
}

function parsePercentage(value) {
	if (!value) {
		return 0;
	}
	const match = value.match(/(\d+(?:\.\d+)?)/);
	if (!match) {
		return 0;
	}
	return Number.parseFloat(match[1]);
}

// #COMPLETION_DRIVE: Assuming memoryUsage follows "<used>/<total>MB (<percent>%)" structure from /api/system/stats
// #SUGGEST_VERIFY: Inspect API responses on target hosts to confirm parsing before deployment
function parseMemoryUsage(value) {
	if (!value) {
		return { display: "N/A", percent: 0 };
	}
	const primary = value.split("(")[0]?.trim() ?? value;
	const percentMatch = value.match(/(\d+(?:\.\d+)?)%/);
	const percent = percentMatch ? Number.parseFloat(percentMatch[1]) : 0;
	return { display: primary, percent };
}

// #COMPLETION_DRIVE: Assuming diskUsage includes a "(<percent>%)" substring for utilization reporting
// #SUGGEST_VERIFY: Capture sample df output via /api/system/stats across supported distributions
function parseDiskUsage(value) {
	if (!value) {
		return { display: "N/A", percent: 0 };
	}
	const percentMatch = value.match(/(\d+(?:\.\d+)?)%/);
	const percent = percentMatch ? Number.parseFloat(percentMatch[1]) : 0;
	const display = value.split("(")[0]?.trim() ?? value;
	return { display, percent };
}

// #COMPLETION_DRIVE: Assuming temperature string carries a numeric Celsius value
// #SUGGEST_VERIFY: Compare parsed temperature against raw sensor readings on device
function parseTemperature(value) {
	if (!value) {
		return { display: "N/A", percent: 0 };
	}
	const numeric = Number.parseFloat(value.replace(/[^\d.]/g, ""));
	if (Number.isNaN(numeric)) {
		return { display: value, percent: 0 };
	}
	return { display: `${numeric.toFixed(1)}°C`, percent: Math.min(numeric, 100) };
}

function updateMetrics(stats) {
	const cpuPercent = parsePercentage(stats.cpuUsage);
	if (metricValues.cpu) {
		metricValues.cpu.textContent = stats.cpuUsage ?? "N/A";
	}
	if (progressBars.cpu) {
		progressBars.cpu.style.width = `${Math.min(cpuPercent, 100)}%`;
	}

	const memory = parseMemoryUsage(stats.memoryUsage);
	if (metricValues.memory) {
		metricValues.memory.textContent = memory.display;
	}
	if (progressBars.memory) {
		progressBars.memory.style.width = `${Math.min(memory.percent, 100)}%`;
	}

	const temperature = parseTemperature(stats.temperature);
	if (metricValues.temperature) {
		metricValues.temperature.textContent = temperature.display;
	}
	if (progressBars.temperature) {
		progressBars.temperature.style.width = `${temperature.percent}%`;
	}

	const disk = parseDiskUsage(stats.diskUsage);
	if (metricValues.storage) {
		metricValues.storage.textContent = disk.display;
	}
	if (progressBars.storage) {
		progressBars.storage.style.width = `${Math.min(disk.percent, 100)}%`;
	}

	if (infoSlots.uptime) {
		infoSlots.uptime.textContent = stats.uptime ?? "--";
	}
}

async function fetchStats() {
	try {
		const response = await fetch("/api/system/stats", { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`Status ${response.status}`);
		}
		const stats = await response.json();
		updateMetrics(stats);
	} catch (error) {
		showNotification("Failed to refresh system stats", "error");
		console.error(error);
	}
}

async function sendCommand(command) {
	try {
		const response = await fetch("/api/system/command", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ command })
		});
		if (!response.ok) {
			throw new Error(`Status ${response.status}`);
		}
		const result = await response.json();
		if (result.success) {
			showNotification(`Command ${command} acknowledged`, "success");
			await fetchStats();
		} else {
			throw new Error("Command rejected");
		}
	} catch (error) {
		showNotification(`Command ${command} failed`, "error");
		console.error(error);
	}
}

function attachCommandHandlers() {
	const buttons = document.querySelectorAll('[data-command]');
	buttons.forEach(button => {
		button.addEventListener("click", async () => {
			const command = button.getAttribute("data-command");
			if (!command) {
				return;
			}
			await sendCommand(command);
		});
	});
}

function attachSettingsHandler() {
	const settingsTrigger = document.querySelector('[data-settings-toggle="open"]');
	const dialog = document.getElementById("settings-dialog");
	if (!settingsTrigger || !dialog) {
		return;
	}
	settingsTrigger.addEventListener("click", () => {
		dialog.showModal();
	});
}

function attachQuickActions() {
	const quickActionButtons = document.querySelectorAll('[data-action]');
	quickActionButtons.forEach(button => {
		button.addEventListener("click", () => {
			const action = button.getAttribute("data-action") ?? "action";
			showNotification(`${action.replace(/-/g, " ")} triggered`, "success");
		});
	});
}

function attachPackageHandlers() {
	const packageButtons = document.querySelectorAll('[data-package-install]');
	packageButtons.forEach(button => {
		button.addEventListener("click", () => {
			const name = button.getAttribute("data-package-install") ?? "package";
			showNotification(`${name} queued`, "success");
		});
	});
}

function initialize() {
	attachCommandHandlers();
	attachSettingsHandler();
	attachQuickActions();
	attachPackageHandlers();
	fetchStats();
	setInterval(fetchStats, 15000);
}

initialize();
