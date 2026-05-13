import { ipcMain } from "electron"
import { IPC_CHANNELS } from "@src/ipc/ipcChannels"
import {
  getRequiredRuntime,
  isRuntimeCached,
  downloadRuntime,
  getDotnetEnv,
  getRuntimeSize
} from "@src/utils/dotnetRuntimeManager"
import { logMessage } from "@src/utils/logManager"

ipcMain.handle(IPC_CHANNELS.DOTNET_MANAGER.GET_REQUIRED_RUNTIME, (_event, vsVersion: string): string | null => {
  return getRequiredRuntime(vsVersion)
})

ipcMain.handle(IPC_CHANNELS.DOTNET_MANAGER.IS_RUNTIME_CACHED, (_event, runtimeId: string): boolean => {
  return isRuntimeCached(runtimeId)
})

ipcMain.handle(IPC_CHANNELS.DOTNET_MANAGER.GET_DOTNET_ENV, (_event, runtimeId: string): Record<string, string> | null => {
  return getDotnetEnv(runtimeId)
})

ipcMain.handle(IPC_CHANNELS.DOTNET_MANAGER.GET_RUNTIME_SIZE, (_event, runtimeId: string): number => {
  return getRuntimeSize(runtimeId)
})

ipcMain.handle(IPC_CHANNELS.DOTNET_MANAGER.DOWNLOAD_RUNTIME, async (event, runtimeId: string): Promise<boolean> => {
  logMessage("info", `[back] [ipc] [ipc/handlers/dotnetHandlers.ts] [DOWNLOAD_RUNTIME] Starting download for ${runtimeId}.`)

  return await downloadRuntime(runtimeId, (progress) => {
    event.sender.send(IPC_CHANNELS.DOTNET_MANAGER.DOWNLOAD_PROGRESS, runtimeId, progress)
  })
})
