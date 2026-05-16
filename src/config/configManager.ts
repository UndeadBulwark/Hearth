import { app } from "electron"
import fse from "fs-extra"
import { join } from "path"
import { logMessage } from "@src/utils/logManager"
import { saveAccountSession } from "@src/utils/accountSessionManager"
import { v4 as uuidv4 } from "uuid"

/**
 * VERSIONS LIST
 * 1.0: 0.0.1 -> 0.0.5
 * 1.1: 1.0.0
 * 1.2: 1.1.0 -> 1.2.3
 * 1.3: 1.3.0 -> 1.3.2
 * 1.4: 1.4.0
 * 1.5: 1.4.1 -> 1.4.3
 * 1.6: 1.4.4
 * 1.7: 1.5.0 -> (multi-account support)
 */
const defaultConfig: ConfigType = {
  version: 1.7,
  lastUsedInstallation: null,
  lastUsedAccountId: null,
  defaultInstallationsFolder: join(app.getPath("appData"), "VSLInstallations"),
  defaultVersionsFolder: join(app.getPath("appData"), "VSLGameVersions"),
  backupsFolder: join(app.getPath("appData"), "VSLBackups"),
  window: {
    width: 1280,
    height: 720,
    x: 0,
    y: 0,
    maximized: false
  },
  accounts: [],
  installations: [],
  gameVersions: [],
  favMods: [],
  customIcons: [],
  minimizeToTray: false,
  hideLauncherWhilePlaying: false,
  showLauncherWhenGameStops: false
}

const defaultInstallation: InstallationType = {
  id: "",
  name: "",
  icon: "",
  path: "",
  version: "",
  startParams: "",
  backupsLimit: 3,
  backupsAuto: false,
  compressionLevel: 0,
  backups: [],
  lastTimePlayed: -1,
  totalTimePlayed: 0,
  mesaGlThread: false,
  envVars: ""
}

const defaultGameVersion: GameVersionType = {
  version: "",
  path: ""
}

let configPath: string

export async function saveConfig(config: ConfigType): Promise<boolean> {
  try {
    const cleanedConfig = JSON.parse(
      JSON.stringify(config, (key, value) => {
        return key.startsWith("_") ? undefined : value
      })
    )
    await fse.writeJSON(configPath, cleanedConfig)
    return true
  } catch (err) {
    logMessage("error", `[back] [config] [config/configManager.ts] [saveConfig] Error saving config at ${configPath}.`)
    logMessage("debug", `[back] [config] [config/configManager.ts] [saveConfig] Error saving config at ${configPath}: ${err}`)
    return false
  }
}

export async function getConfig(): Promise<ConfigType> {
  try {
    if (!(await ensureConfig())) return defaultConfig
    const config = await fse.readJSON(configPath, "utf-8")
    const ensuredConfig = await ensureConfigProperties(config)
    return ensuredConfig
  } catch (err) {
    logMessage("error", `[back] [config] [config/configManager.ts] [getConfig] Error getting config at ${configPath}. Using default config.`)
    logMessage("debug", `[back] [config] [config/configManager.ts] [getConfig] Error getting config at ${configPath}: ${err}`)
    await saveConfig(defaultConfig)
    return defaultConfig
  }
}

export async function ensureConfig(): Promise<boolean> {
  configPath = join(app.getPath("userData"), "config.json")
  try {
    if (!(await fse.pathExists(configPath))) {
      logMessage("info", `[back] [config] [config/configManager.ts] [ensureConfig] Config not found. Creating default config.`)
      return await saveConfig(defaultConfig)
    }
    logMessage("info", `[back] [config] [config/configManager.ts] [ensureConfig] Config found at ${configPath}.`)
    return true
  } catch (err) {
    logMessage("error", `[back] [config] [config/configManager.ts] [ensureConfig] Error ensuring config.`)
    logMessage("error", `[back] [config] [config/configManager.ts] [ensureConfig] Error ensuring config at ${configPath}: ${err}`)
    return false
  }
}

async function ensureConfigProperties(config: ConfigType): Promise<ConfigType> {
  const installations: InstallationType[] = (config.installations || []).map((installation) => ({
    id: installation.id ?? defaultInstallation.id,
    name: installation.name ?? defaultInstallation.name,
    icon: installation.icon ?? defaultInstallation.icon,
    path: installation.path ?? defaultInstallation.path,
    version: installation.version ?? defaultInstallation.version,
    startParams: installation.startParams ?? defaultInstallation.startParams,
    backupsLimit: installation.backupsLimit ?? defaultInstallation.backupsLimit,
    backupsAuto: installation.backupsAuto ?? defaultInstallation.backupsAuto,
    compressionLevel: installation.compressionLevel ?? defaultInstallation.compressionLevel,
    backups: installation.backups ?? defaultInstallation.backups,
    lastTimePlayed: installation.lastTimePlayed ?? defaultInstallation.lastTimePlayed,
    totalTimePlayed: installation.totalTimePlayed ?? defaultInstallation.totalTimePlayed,
    mesaGlThread: installation.mesaGlThread ?? defaultInstallation.mesaGlThread,
    envVars: installation.envVars ?? defaultInstallation.envVars
  }))

  const gameVersions: GameVersionType[] = (config.gameVersions || []).map((gameVersion) => ({
    version: gameVersion.version ?? defaultGameVersion.version,
    path: gameVersion.path ?? defaultGameVersion.path
  }))

  const customIcons: IconType[] = !config.customIcons
    ? defaultConfig.customIcons
    : config.customIcons.filter((icon) => icon.id && icon.id.length > 0 && icon.icon && icon.icon.endsWith(".png") && icon.name && icon.name.length > 0)

  let accounts: AccountMetadataType[] = config.accounts ?? defaultConfig.accounts
  let lastUsedAccountId = config.lastUsedAccountId ?? defaultConfig.lastUsedAccountId

  // Migrate legacy single account to multi-account structure
  if ((config as unknown as { account?: AccountType | null }).account) {
    try {
      const legacyAccount = (config as unknown as { account: AccountType }).account
      const accountId = uuidv4()
      const metadata: AccountMetadataType = {
        id: accountId,
        email: legacyAccount.email,
        playerName: legacyAccount.playerName,
        playerUid: legacyAccount.playerUid
      }
      const session: EncryptedSessionDataType = {
        mptoken: legacyAccount.mptoken,
        sessionKey: legacyAccount.sessionKey,
        sessionSignature: legacyAccount.sessionSignature,
        playerEntitlements: legacyAccount.playerEntitlements,
        hostGameServer: legacyAccount.hostGameServer
      }
      await saveAccountSession(accountId, session)
      accounts = [metadata]
      lastUsedAccountId = accountId
      logMessage("info", `[back] [config] [config/configManager.ts] [ensureConfigProperties] Migrated legacy account to multi-account.`)
    } catch (err) {
      logMessage("error", `[back] [config] [config/configManager.ts] [ensureConfigProperties] Failed migrating legacy account: ${err}`)
    }
  }

  const fixedConfig: ConfigType = {
    version: !config.version || config.version < defaultConfig.version ? defaultConfig.version : config.version,
    lastUsedInstallation: config.lastUsedInstallation ?? defaultConfig.lastUsedInstallation,
    lastUsedAccountId,
    defaultInstallationsFolder: config.defaultInstallationsFolder ?? defaultConfig.defaultInstallationsFolder,
    defaultVersionsFolder: config.defaultVersionsFolder ?? defaultConfig.defaultVersionsFolder,
    backupsFolder: config.backupsFolder ?? defaultConfig.backupsFolder,
    window: config.window ?? defaultConfig.window,
    accounts,
    installations,
    gameVersions,
    favMods: config.favMods ?? defaultConfig.favMods,
    customIcons,
    minimizeToTray: config.minimizeToTray ?? defaultConfig.minimizeToTray,
    hideLauncherWhilePlaying: config.hideLauncherWhilePlaying ?? defaultConfig.hideLauncherWhilePlaying,
    showLauncherWhenGameStops: config.showLauncherWhenGameStops ?? defaultConfig.showLauncherWhenGameStops
  }

  return fixedConfig
}
