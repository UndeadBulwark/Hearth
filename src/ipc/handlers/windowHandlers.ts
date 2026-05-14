import { ipcMain } from "electron"
import { IPC_CHANNELS } from "@src/ipc/ipcChannels"
import { getMainWindowRef } from "@src/utils/windowRef"
import { logMessage } from "@src/utils/logManager"

ipcMain.on(IPC_CHANNELS.WINDOW_MANAGER.HIDE, () => {
  logMessage("info", "[back] [ipc] [ipc/handlers/windowHandlers.ts] [HIDE] Hiding main window.")
  const win = getMainWindowRef()
  if (win) win.hide()
})

ipcMain.on(IPC_CHANNELS.WINDOW_MANAGER.SHOW, () => {
  logMessage("info", "[back] [ipc] [ipc/handlers/windowHandlers.ts] [SHOW] Showing main window.")
  const win = getMainWindowRef()
  if (win) {
    win.show()
    win.focus()
  }
})

ipcMain.handle(IPC_CHANNELS.WINDOW_MANAGER.CLOSE_TO_TRAY, () => {
  logMessage("info", "[back] [ipc] [ipc/handlers/windowHandlers.ts] [CLOSE_TO_TRAY] Checking close to tray.")
  const win = getMainWindowRef()
  if (win) win.hide()
})