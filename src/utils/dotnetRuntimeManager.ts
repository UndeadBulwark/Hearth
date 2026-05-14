import { join } from "path"
import fse from "fs-extra"
import { app } from "electron"
import axios from "axios"
import { createWriteStream } from "fs"
import { pipeline } from "stream/promises"
import { spawn } from "child_process"
import { logMessage } from "./logManager"

const RUNTIME_URLS: Record<string, string> = {
  "dotnet-10": "https://builds.dotnet.microsoft.com/dotnet/Runtime/10.0.8/dotnet-runtime-10.0.8-linux-x64.tar.gz",
  "dotnet-8": "https://builds.dotnet.microsoft.com/dotnet/Runtime/8.0.27/dotnet-runtime-8.0.27-linux-x64.tar.gz",
  "dotnet-7": "https://builds.dotnet.microsoft.com/dotnet/Runtime/7.0.20/dotnet-runtime-7.0.20-linux-x64.tar.gz",
  "mono": "https://github.com/UndeadBulwark/vs-launcher-mono-runtime/releases/download/v6.12.0.182/mono-6.12.0.182-linux-x64.tar.gz"
}

const RUNTIME_SIZES: Record<string, number> = {
  "dotnet-10": 38,
  "dotnet-8": 32,
  "dotnet-7": 31,
  "mono": 30
}

export function getRuntimesDir(): string {
  return join(app.getPath("userData"), "runtimes")
}

export function getRequiredRuntime(vsVersion: string): string | null {
  const [major, minor] = vsVersion.split(".").map(Number)
  if (major > 1 || (major === 1 && minor >= 22)) return "dotnet-10"
  if (major === 1 && minor >= 21) return "dotnet-8"
  if (major === 1 && minor >= 18) return "dotnet-7"
  return "mono"
}

export function getMonoPath(): string {
  return join(getRuntimesDir(), "mono")
}

export function isMonoCached(): boolean {
  return fse.existsSync(join(getMonoPath(), "usr", "bin", "mono-sgen"))
}

export function getMonoEnv(): Record<string, string> | null {
  const monoPath = getMonoPath()
  if (!isMonoCached()) return null

  const monoLib = join(monoPath, "usr", "lib")
  const currentLdPath = process.env.LD_LIBRARY_PATH || ""
  const monoRuntimeLibPath = join(monoLib, "mono", "4.5")
  return {
    LD_LIBRARY_PATH: currentLdPath ? `${monoLib}:${currentLdPath}` : monoLib,
    MONO_PATH: monoRuntimeLibPath,
    MONO_CFG_DIR: monoPath
  }
}

export function getRuntimePath(runtimeId: string): string {
  return join(getRuntimesDir(), runtimeId)
}

export function isRuntimeCached(runtimeId: string): boolean {
  if (runtimeId === "mono") return isMonoCached()
  const path = getRuntimePath(runtimeId)
  return fse.existsSync(join(path, "dotnet"))
}

export function getRuntimeSize(runtimeId: string): number {
  return RUNTIME_SIZES[runtimeId] ?? 55
}

export async function downloadRuntime(
  runtimeId: string,
  onProgress: (progress: number) => void
): Promise<boolean> {
  try {
    const url = RUNTIME_URLS[runtimeId]
    if (!url) {
      logMessage("error", `[back] [dotnetRuntimeManager] No download URL for ${runtimeId}`)
      return false
    }

    const runtimesDir = getRuntimesDir()
    const runtimePath = getRuntimePath(runtimeId)
    const tarPath = join(runtimesDir, `${runtimeId}.tar.gz`)

    fse.ensureDirSync(runtimesDir)
    if (fse.existsSync(runtimePath)) fse.removeSync(runtimePath)

    logMessage("info", `[back] [dotnetRuntimeManager] Downloading ${runtimeId} from ${url}`)

    const response = await axios({
      method: "GET",
      url,
      responseType: "stream"
    })

    const totalLength = parseInt(response.headers["content-length"] || "0", 10)
    let downloadedLength = 0

    const writer = createWriteStream(tarPath)
    response.data.on("data", (chunk: Buffer) => {
      downloadedLength += chunk.length
      if (totalLength > 0) {
        onProgress(Math.round((downloadedLength / totalLength) * 100))
      }
    })

    await pipeline(response.data, writer)

    logMessage("info", `[back] [dotnetRuntimeManager] Extracting ${runtimeId} to ${runtimePath}`)
    fse.ensureDirSync(runtimePath)

    await new Promise<void>((resolve, reject) => {
      const tar = spawn("tar", ["-xzf", tarPath, "-C", runtimePath])
      tar.on("close", (code) => {
        if (code === 0) resolve()
        else reject(new Error(`tar exited with code ${code}`))
      })
      tar.on("error", (err) => reject(err))
    })

    fse.removeSync(tarPath)
    logMessage("info", `[back] [dotnetRuntimeManager] ${runtimeId} installed successfully.`)
    return true
  } catch (err) {
    logMessage("error", `[back] [dotnetRuntimeManager] Failed to download ${runtimeId}: ${err}`)
    return false
  }
}

export function getDotnetEnv(runtimeId: string): Record<string, string> | null {
  if (runtimeId === "mono") return getMonoEnv()
  const runtimePath = getRuntimePath(runtimeId)
  if (!isRuntimeCached(runtimeId)) return null

  return {
    DOTNET_ROOT: runtimePath,
    PATH: `${runtimePath}:${process.env.PATH ?? ""}`
  }
}
