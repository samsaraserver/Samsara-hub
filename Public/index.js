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

function parseMemoryUsage(value) {
	if (!value) {
		return { display: "N/A", percent: 0 };
	}
	const trimmed = value.trim();
	let percent = parsePercentage(trimmed);
	if (percent === 0) {
		const ratioMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[A-Za-z]*\s*\/\s*(\d+(?:\.\d+)?)/);
		if (ratioMatch) {
			const used = Number.parseFloat(ratioMatch[1]);
			const total = Number.parseFloat(ratioMatch[2]);
			if (!Number.isNaN(used) && !Number.isNaN(total) && total > 0) {
				percent = Math.min((used / total) * 100, 100);
			}
		}
	}
	const display = trimmed.includes("(") ? trimmed.split("(")[0].trim() : trimmed;
	return { display, percent };
}

function parseDiskUsage(value) {
	if (!value) {
		return { display: "N/A", percent: 0 };
	}
	const trimmed = value.trim();
	const percentMatch = trimmed.match(/\((\d+(?:\.\d+)?)%\)/);
	if (percentMatch) {
		const percent = Number.parseFloat(percentMatch[1]);
		const display = trimmed.replace(/\([^)]+\)/, "").trim();
		return { display, percent: Math.min(percent, 100) };
	}
	let percent = parsePercentage(trimmed);
	if (percent === 0) {
		const ratioMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[A-Za-z]*\s*\/\s*(\d+(?:\.\d+)?)/);
		if (ratioMatch) {
			const used = Number.parseFloat(ratioMatch[1]);
			const total = Number.parseFloat(ratioMatch[2]);
			if (!Number.isNaN(used) && !Number.isNaN(total) && total > 0) {
				percent = Math.min((used / total) * 100, 100);
			}
		}
	}
	const display = trimmed.includes("(") ? trimmed.split("(")[0].trim() : trimmed;
	return { display, percent };
}

function parseTemperature(value) {
	if (!value) {
		return { display: "N/A", percent: 0 };
	}
	const raw = value.trim();
	const numericMatch = raw.match(/-?\d+(?:\.\d+)?/);
	if (!numericMatch) {
		return { display: raw, percent: 0 };
	}
	const reading = Number.parseFloat(numericMatch[0]);
	if (Number.isNaN(reading)) {
		return { display: raw, percent: 0 };
	}
	const isFahrenheit = /f/i.test(raw) && !/c/i.test(raw);
	const celsius = isFahrenheit ? ((reading - 32) * 5) / 9 : reading;
	const display = `${celsius.toFixed(1)}°C`;
	const percent = Math.max(0, Math.min((celsius / 100) * 100, 100));
	return { display, percent };
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
			const errorData = await response.json();
			throw new Error(errorData.error || `Status ${response.status}`);
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
		console.error("Command error:", error);
	}
}

function attachCommandHandlers() {
	const buttons = document.querySelectorAll('[data-command]');
	for (const button of buttons) {
		button.addEventListener("click", async () => {
			const command = button.dataset.command;
			if (!command) {
				return;
			}
			await sendCommand(command);
		});
	}
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
	for (const button of quickActionButtons) {
		button.addEventListener("click", () => {
			const action = button.dataset.action ?? "action";
			showNotification(`${action.replaceAll("-", " ")} triggered`, "success");
		});
	}
}

function attachPackageHandlers() {
	const packageButtons = document.querySelectorAll('[data-package-install]');
	for (const button of packageButtons) {
		button.addEventListener("click", () => {
			const name = button.dataset.packageInstall ?? "package";
			showNotification(`${name} queued`, "success");
		});
	}
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
