import { ipcMain } from "electron"
import { IPC_CHANNELS } from "@src/ipc/ipcChannels"
import { logMessage } from "@src/utils/logManager"
import { saveAccountSession, getAccountSession, deleteAccountSession } from "@src/utils/accountSessionManager"
import { getConfig, saveConfig } from "@src/config/configManager"

ipcMain.handle(IPC_CHANNELS.ACCOUNT_MANAGER.SAVE_ACCOUNT, async (_event, account: AccountType): Promise<{ id: string; metadata: AccountMetadataType }> => {
  logMessage("info", `[back] [ipc] [accountHandlers] [SAVE_ACCOUNT] Saving account for ${account.email}.`)

  const metadata: AccountMetadataType = {
    id: account.playerUid + Date.now().toString(36),
    email: account.email,
    playerName: account.playerName,
    playerUid: account.playerUid
  }

  const session: EncryptedSessionDataType = {
    mptoken: account.mptoken,
    sessionKey: account.sessionKey,
    sessionSignature: account.sessionSignature,
    playerEntitlements: account.playerEntitlements,
    hostGameServer: account.hostGameServer
  }

  await saveAccountSession(metadata.id, session)

  const config = await getConfig()

  // Prevent duplicate accounts (same email)
  const existingIndex = config.accounts.findIndex((a) => a.email === metadata.email)
  if (existingIndex >= 0) {
    const oldId = config.accounts[existingIndex]!.id
    await deleteAccountSession(oldId)
    config.accounts[existingIndex] = metadata
    logMessage("info", `[back] [ipc] [accountHandlers] [SAVE_ACCOUNT] Replaced existing account ${metadata.email}.`)
  } else {
    config.accounts.push(metadata)
  }

  await saveConfig(config)

  return { id: metadata.id, metadata }
})

ipcMain.handle(IPC_CHANNELS.ACCOUNT_MANAGER.REMOVE_ACCOUNT, async (_event, id: string): Promise<boolean> => {
  logMessage("info", `[back] [ipc] [accountHandlers] [REMOVE_ACCOUNT] Removing account ${id}.`)

  await deleteAccountSession(id)

  const config = await getConfig()
  config.accounts = config.accounts.filter((a) => a.id !== id)

  if (config.lastUsedAccountId === id) {
    config.lastUsedAccountId = config.accounts.length > 0 ? config.accounts[0]!.id : null
  }

  await saveConfig(config)
  return true
})

ipcMain.handle(IPC_CHANNELS.ACCOUNT_MANAGER.GET_ACCOUNT_SESSION, async (_event, id: string): Promise<EncryptedSessionDataType | null> => {
  const session = await getAccountSession(id)
  return session
})
