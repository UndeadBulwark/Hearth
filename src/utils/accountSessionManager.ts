import { app, safeStorage } from "electron"
import fse from "fs-extra"
import { join } from "path"
import { logMessage } from "@src/utils/logManager"

const sessionsPath = (): string => join(app.getPath("userData"), "sessions.json")

function loadSessions(): Record<string, string> {
  try {
    if (!fse.existsSync(sessionsPath())) return {}
    return fse.readJSONSync(sessionsPath(), "utf-8") as Record<string, string>
  } catch (err) {
    logMessage("error", `[back] [accounts] [accountSessionManager] [loadSessions] Error loading sessions: ${err}`)
    return {}
  }
}

function saveSessions(sessions: Record<string, string>): void {
  try {
    fse.ensureFileSync(sessionsPath())
    fse.writeJSONSync(sessionsPath(), sessions)
  } catch (err) {
    logMessage("error", `[back] [accounts] [accountSessionManager] [saveSessions] Error saving sessions: ${err}`)
  }
}

export async function saveAccountSession(id: string, session: EncryptedSessionDataType): Promise<void> {
  const sessions = loadSessions()
  const data = JSON.stringify(session)

  if (safeStorage.isEncryptionAvailable()) {
    sessions[id] = safeStorage.encryptString(data).toString("base64")
  } else {
    logMessage("warn", `[back] [accounts] [accountSessionManager] [saveAccountSession] OS encryption unavailable. Storing session plaintext.`)
    sessions[id] = data
  }

  saveSessions(sessions)
}

export async function getAccountSession(id: string): Promise<EncryptedSessionDataType | null> {
  const sessions = loadSessions()
  const entry = sessions[id]
  if (!entry) return null

  try {
    let jsonStr: string
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(entry, "base64")
      jsonStr = safeStorage.decryptString(buffer)
    } else {
      jsonStr = entry
    }

    const parsed = JSON.parse(jsonStr) as EncryptedSessionDataType
    return parsed
  } catch (err) {
    logMessage("error", `[back] [accounts] [accountSessionManager] [getAccountSession] Error decrypting session for ${id}: ${err}`)
    return null
  }
}

export async function deleteAccountSession(id: string): Promise<void> {
  const sessions = loadSessions()
  if (sessions[id]) {
    delete sessions[id]
    saveSessions(sessions)
  }
}

export async function hasAccountSession(id: string): Promise<boolean> {
  const sessions = loadSessions()
  return !!sessions[id]
}
