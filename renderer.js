const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  createMLO: (data) => ipcRenderer.invoke("create-mlo", data),
  createScript: (data) => ipcRenderer.invoke("create-script", data),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  pickScriptDir: () => ipcRenderer.invoke("pick-script"),
  pickMloDir: () => ipcRenderer.invoke("pick-mlo"),
});

contextBridge.exposeInMainWorld("windowControls", {
  close: () => ipcRenderer.send("close-window"),
  minimize: () => ipcRenderer.send("minimize-window"),
});
