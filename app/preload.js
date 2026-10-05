const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('platformApi', {
  getPlatform: () => process.platform,
  getVersion: () => process.versions,
});
