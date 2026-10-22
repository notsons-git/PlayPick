/// <reference types="vite/client" />

interface Window {
  electronAPI: import('./src/types/electron').ElectronAPI
}
