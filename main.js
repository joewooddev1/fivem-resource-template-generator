const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let settings = {
  scriptDir: null,
  mloDir: null,
};

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      settings = JSON.parse(fs.readFileSync(p, "utf8"));
    }
  } catch (e) {
    console.log("settings.json invalid, resetting", e);
    settings = { scriptDir: null, mloDir: null };
  }
}

function saveSettings() {
  const p = getSettingsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(settings, null, 2), "utf8");
}

async function pickFolder(label) {
  const res = await dialog.showOpenDialog({
    title: `Select ${label} Directory`,
    properties: ["openDirectory"],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 700,
    height: 780,

    resizable: false,

    // Appearance
    frame: false,              // Remove OS titlebar
    transparent: true,         // Allow rounded corners + blur
    vibrancy: "sidebar",       // Windows 11 acrylic blur
    visualEffectState: "active",
    backgroundColor: "#00000000",

    // Nice shadows
    hasShadow: true,

    webPreferences: {
      preload: path.join(__dirname, "renderer.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  loadSettings();
  createWindow();
});

/* IPC: settings + folder pickers */

ipcMain.handle("get-settings", () => settings);

ipcMain.handle("pick-script", async () => {
  const folder = await pickFolder("Script Resource");
  if (!folder) return "❌ Script folder change cancelled.";
  settings.scriptDir = folder;
  saveSettings();
  return `✅ Script Output Directory Updated:\n${folder}`;
});

ipcMain.handle("pick-mlo", async () => {
  const folder = await pickFolder("MLO Resource");
  if (!folder) return "❌ MLO folder change cancelled.";
  settings.mloDir = folder;
  saveSettings();
  return `✅ MLO Output Directory Updated:\n${folder}`;
});

/* IPC: create MLO */

ipcMain.handle("create-mlo", (event, data) => {
  const { name, description, author } = data;
  if (!name) return "❌ Resource name required.";
  if (!settings.mloDir) return "❌ MLO output path is not set (use the 📁 icon).";

  const base = path.join(settings.mloDir, name);
  const stream = path.join(base, "stream");
  fs.mkdirSync(stream, { recursive: true });

  const manifest = `fx_version 'cerulean'
game 'gta5'

-- Resource metadata
name '${name}'
description '${description}'
author '${author}'
version '1.0.0'

this_is_a_map 'yes'
`;

  fs.writeFileSync(path.join(base, "fxmanifest.lua"), manifest);
  return `✅ MLO Resource Created:\n${base}`;
});

/* IPC: create Script resource */

ipcMain.handle("create-script", (event, data) => {
  const { name, description, author } = data;
  if (!name) return "❌ Resource name required.";
  if (!settings.scriptDir) return "❌ Script output path is not set (use the 📁 icon).";

  const base = path.join(settings.scriptDir, name);
  const client = path.join(base, "client");
  const server = path.join(base, "server");
  const shared = path.join(base, "shared");

  fs.mkdirSync(client, { recursive: true });
  fs.mkdirSync(server, { recursive: true });
  fs.mkdirSync(shared, { recursive: true });

  const manifest = `fx_version 'cerulean'
game 'gta5'

-- Resource metadata
name '${name}'
description '${description}'
author '${author}'
version '1.0.0'

-- Shared config
shared_script 'shared/config.lua'

-- Client Scripts
client_scripts {
    'client/*.lua'
}

-- Server Scripts
server_scripts {
    'server/*.lua'
}
`;

  const config = `Config = {}
`;

  fs.writeFileSync(path.join(base, "fxmanifest.lua"), manifest);
  fs.writeFileSync(path.join(shared, "config.lua"), config);

  return `✅ Script Resource Created:\n${base}`;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("close-window", (event) => {
  BrowserWindow.fromWebContents(event.sender).close();
});

ipcMain.on("minimize-window", (event) => {
  BrowserWindow.fromWebContents(event.sender).minimize();
});

