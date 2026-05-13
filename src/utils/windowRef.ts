import { BrowserWindow } from "electron"

export let mainWindowRef: BrowserWindow | null = null
export let cachedMinimizeToTray = false

export function setMainWindowRef(win: BrowserWindow): void {
  mainWindowRef = win
}

export function getMainWindowRef(): BrowserWindow | null {
  return mainWindowRef
}

export function setCachedMinimizeToTray(value: boolean): void {
  cachedMinimizeToTray = value
}
