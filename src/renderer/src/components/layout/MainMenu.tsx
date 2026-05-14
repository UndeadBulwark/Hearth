import { ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"
import {
  PiBoxArrowDownDuotone,
  PiFolderOpenDuotone,
  PiGearDuotone,
  PiWrenchDuotone,
  PiGitForkDuotone,
  PiHouseLineDuotone,
  PiPencilDuotone,
  PiPlusCircleDuotone,
  PiInfoDuotone,
  PiDownloadDuotone,
  PiCaretUpDuotone
} from "react-icons/pi"
import { v4 as uuidv4 } from "uuid"
import clsx from "clsx"
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react"
import { AnimatePresence, motion } from "motion/react"

import { useConfigContext, CONFIG_ACTIONS } from "@renderer/features/config/contexts/ConfigContext"
import { useNotificationsContext } from "@renderer/contexts/NotificationsContext"
import { useMakeInstallationBackup } from "@renderer/features/installations/hooks/useMakeInstallationBackup"

import { INSTALLATION_ICONS } from "@renderer/utils/installationIcons"
import { DROPUP_MENU_ITEM_VARIANTS, DROPUP_MENU_WRAPPER_VARIANTS } from "@renderer/utils/animateVariants"

import { useTaskContext } from "@renderer/contexts/TaskManagerContext"

import { NormalButton } from "@renderer/components/ui/Buttons"
import { FormButton, FormLinkButton } from "@renderer/components/ui/FormComponents"
import PopupDialogPanel from "@renderer/components/ui/PopupDialogPanel"
import SessionButton from "../ui/SessionButton"

interface MainMenuLinkProps {
  icon: ReactNode
  text: string
  desc: string
  to: string
}

function MainMenu(): JSX.Element {
  const { t } = useTranslation()
  const { config, configDispatch } = useConfigContext()
  const { addNotification } = useNotificationsContext()
  const { startRuntimeDownload } = useTaskContext()

  const makeInstallationBackup = useMakeInstallationBackup()

  const [selectedInstallation, setSelectedInstallation] = useState<InstallationType | undefined>(undefined)
  const [runningDots, setRunningDots] = useState(0)
  const [runtimeDialogOpen, setRuntimeDialogOpen] = useState(false)
  const [pendingRuntime, setPendingRuntime] = useState<{ id: string; name: string; size: number } | null>(null)
  const [runtimeDownloading, setRuntimeDownloading] = useState(false)
  const [runtimeProgress, setRuntimeProgress] = useState(0)
  const [launchingGuard, setLaunchingGuard] = useState(false)

  useEffect(() => {
    window.api.dotnetManager.onDownloadProgress((_event, _runtimeId, progress) => {
      setRuntimeProgress(progress)
    })
  }, [])

  useEffect(() => {
    const si = config.installations.find((i) => i.id === config.lastUsedInstallation)
    setSelectedInstallation(si)
  }, [config.lastUsedInstallation, config.installations])

  useEffect(() => {
    if (!selectedInstallation?._playing) return

    const id = setInterval(() => {
      setRunningDots((d) => (d + 1) % 3)
    }, 400)

    return () => clearInterval(id)
  }, [selectedInstallation?._playing])

  const GROUP_1: MainMenuLinkProps[] = [
    { icon: <PiHouseLineDuotone />, text: t("components.mainMenu.homeTitle"), desc: t("components.mainMenu.homeDesc"), to: "/" },
    { icon: <PiFolderOpenDuotone />, text: t("components.mainMenu.installationsTitle"), desc: t("components.mainMenu.installationsDesc"), to: "/installations" },
    { icon: <PiGitForkDuotone />, text: t("components.mainMenu.versionsTitle"), desc: t("components.mainMenu.versionsDesc"), to: "/versions" },
    { icon: <PiWrenchDuotone />, text: t("components.mainMenu.modsTitle"), desc: t("components.mainMenu.modsDesc"), to: "/mods" },
    { icon: <PiGearDuotone />, text: t("components.mainMenu.configTitle"), desc: t("components.mainMenu.configDesc"), to: "/config" },
    { icon: <PiInfoDuotone />, text: t("components.mainMenu.infoAndHelpTitle"), desc: t("components.mainMenu.infoAndHelpDesc"), to: "/info-and-help" }
  ]

  async function PlayHandler(): Promise<void> {
    if (launchingGuard) return addNotification(t("features.installations.gameAlreadyRunning"), "error")
    setLaunchingGuard(true)

    const id = uuidv4()
    window.api.utils.setPreventAppClose("add", id, "Started playing Vintage Story.")

    try {
      if (!selectedInstallation) return addNotification(t("features.installations.noInstallationSelected"), "error")
      if (selectedInstallation._playing) return addNotification(t("features.installations.gameAlreadyRunning"), "error")

      const gameVersionToRun = config.gameVersions.find((gv) => gv.version === selectedInstallation.version)
      if (!gameVersionToRun) return addNotification(t("features.versions.versionNotInstalled", { version: selectedInstallation.version }), "error")
      if (gameVersionToRun._installing) return addNotification(t("features.versions.versionInstalling", { version: selectedInstallation.version }), "error")
      if (gameVersionToRun._deleting) return addNotification(t("features.versions.versionDeleting", { version: selectedInstallation.version }), "error")
      if (gameVersionToRun._playing) return addNotification(t("features.versions.versionPlaying", { version: selectedInstallation.version }), "error")

      // --- .NET Runtime check ---
      const requiredRuntime = await window.api.dotnetManager.getRequiredRuntime(gameVersionToRun.version)
      let dotnetEnv: Record<string, string> | undefined

      if (requiredRuntime) {
        const isCached = await window.api.dotnetManager.isRuntimeCached(requiredRuntime)

        if (!isCached) {
          const runtimeSize = await window.api.dotnetManager.getRuntimeSize(requiredRuntime)

          if (!runtimeDialogOpen) {
            const displayName = requiredRuntime === "mono" ? "Mono" : requiredRuntime.replace("dotnet-", ".NET ")
            setPendingRuntime({ id: requiredRuntime, name: displayName, size: runtimeSize })
            setRuntimeDialogOpen(true)
            return
          }

          if (!pendingRuntime) return addNotification(t("features.dotnet.runtimeInstallFailed"), "error")

          setRuntimeDownloading(true)
          setRuntimeProgress(0)

          const taskId = uuidv4()

          try {
            window.api.utils.setPreventAppClose("add", taskId, `Started downloading ${requiredRuntime} runtime.`)

            let downloadSuccess = false
            await startRuntimeDownload(requiredRuntime, (status) => {
              downloadSuccess = status
            })

            if (!downloadSuccess) throw new Error("Runtime download failed")
          } catch (err) {
            console.error(`[MainMenu] Failed to download runtime: ${err}`)
            addNotification(t("features.dotnet.runtimeDownloadFailed"), "error")
            setRuntimeDownloading(false)
            return
          } finally {
            window.api.utils.setPreventAppClose("remove", taskId, `Finished downloading ${requiredRuntime} runtime.`)
          }

          setRuntimeDownloading(false)
          setRuntimeDialogOpen(false)
          setPendingRuntime(null)

          // Re-check cache after download
          const nowCached = await window.api.dotnetManager.isRuntimeCached(requiredRuntime)
          if (!nowCached) return addNotification(t("features.dotnet.runtimeInstallFailed"), "error")
        }

        dotnetEnv = await window.api.dotnetManager.getDotnetEnv(requiredRuntime) ?? undefined
      }
      // --- End runtime check ---

      configDispatch({ type: CONFIG_ACTIONS.EDIT_INSTALLATION, payload: { id: selectedInstallation.id, updates: { _playing: true } } })
      configDispatch({ type: CONFIG_ACTIONS.EDIT_GAME_VERSION, payload: { version: gameVersionToRun.version, updates: { _playing: true } } })

      if (selectedInstallation.backupsAuto) {
        const backupMade = await makeInstallationBackup(selectedInstallation.id)
        if (!backupMade) return
      }

      const startedPlaying = Date.now()

      if (config.hideLauncherWhilePlaying) window.api.windowManager.hide()
      window.api.windowManager.minimize()

      const closeStatus = await window.api.gameManager.executeGame(gameVersionToRun, selectedInstallation, config.account, dotnetEnv)

      if (config.showLauncherWhenGameStops) window.api.windowManager.show()

      const finishedPlaying = Date.now()
      const ttp = finishedPlaying - startedPlaying + selectedInstallation.totalTimePlayed
      configDispatch({ type: CONFIG_ACTIONS.EDIT_INSTALLATION, payload: { id: selectedInstallation.id, updates: { _playing: false, lastTimePlayed: finishedPlaying, totalTimePlayed: ttp } } })
      configDispatch({ type: CONFIG_ACTIONS.EDIT_GAME_VERSION, payload: { version: gameVersionToRun.version, updates: { _playing: false } } })
      if (!closeStatus) return addNotification(t("notifications.body.gameExitedWithErrors"), "error")
    } catch (err) {
      addNotification(t("notifications.body.errorExecutingGame"), "error")
    } finally {
      setLaunchingGuard(false)
      window.api.utils.setPreventAppClose("remove", id, "Finished playing vintage Story.")
    }
  }

  const currentInstallation = config.installations.find((i) => i.id === config.lastUsedInstallation)

  return (
    <header className="z-99 w-72 shrink-0 flex flex-col gap-4 p-2 bg-zinc-950/80 shadow-sm shadow-zinc-950/50 backdrop-blur-md border-r border-zinc-400/5">
      <div className="flex items-center shrink-0 gap-2">
        <SessionButton />
      </div>

      <div className="h-full flex flex-col gap-2">
        {GROUP_1.slice(0, 4).map((link) => (
          <Link key={link.to} to={link.to} className="flex items-start">
            <LinkContent icon={link.icon} text={link.text} desc={link.desc} link={link.to} />
          </Link>
        ))}

        <Link to="/downloads" className="flex items-start">
          <LinkContent
            icon={<PiDownloadDuotone />}
            text={t("components.tasksMenu.title")}
            desc={t("components.tasksMenu.desc")}
            link="/downloads"
          />
        </Link>

        {GROUP_1.slice(4).map((link) => (
          <Link key={link.to} to={link.to} className="flex items-start">
            <LinkContent icon={link.icon} text={link.text} desc={link.desc} link={link.to} />
          </Link>
        ))}
      </div>

      {/* Runtime download dialog */}
      <PopupDialogPanel
        title={pendingRuntime ? t("features.dotnet.dialogTitle", { runtime: pendingRuntime.name }) : t("features.dotnet.dialogTitle", { runtime: "Runtime" })}
        isOpen={runtimeDialogOpen}
        close={() => {
          setRuntimeDialogOpen(false)
          setPendingRuntime(null)
        }}
      >
        <div className="flex flex-col gap-4 items-center">
          <p>{pendingRuntime ? t("features.dotnet.dialogDesc", { runtime: pendingRuntime.name, size: pendingRuntime.size }) : t("features.dotnet.dialogDesc", { runtime: "Runtime", size: 0 })}</p>
          <p className="text-zinc-400 text-xs">{t("features.dotnet.dialogCacheNote")}</p>
          {runtimeDownloading && (
            <div className="w-full flex flex-col gap-2 items-center">
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-vs rounded-full transition-all duration-200"
                  style={{ width: `${runtimeProgress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">{t("features.dotnet.downloadingProgress", { progress: runtimeProgress })}</p>
            </div>
          )}
          <div className="flex gap-4">
            <NormalButton
              title={t("generic.cancel")}
              onClick={() => {
                setRuntimeDialogOpen(false)
                setPendingRuntime(null)
              }}
            >
              {t("generic.cancel")}
            </NormalButton>
            {!runtimeDownloading && (
              <NormalButton
                title={t("features.dotnet.buttonDownloadAndPlay")}
                onClick={PlayHandler}
              >
                {t("features.dotnet.buttonDownloadAndPlay")}
              </NormalButton>
            )}
          </div>
        </div>
      </PopupDialogPanel>

      <div className="flex flex-col gap-2">
        {/* Unified Launch Bar */}
        {config.installations.length < 1 ? (
          <div className="w-full h-14 flex items-center justify-center rounded-sm bg-[#a06828] opacity-50 shadow-sm shadow-zinc-950/50">
            <p className="text-sm font-bold">{t("features.installations.noInstallationsFound")}</p>
          </div>
        ) : (
          <Listbox
            value={config.lastUsedInstallation}
            onChange={(selectedInstallation: string) => {
              configDispatch({
                type: CONFIG_ACTIONS.SET_LAST_USED_INSTALLATION,
                payload: selectedInstallation
              })
            }}
          >
            {({ open }) => (
              <div className="relative w-full">
                <div className="relative w-full h-14 flex rounded-sm overflow-hidden bg-[#a06828] shadow-sm shadow-zinc-950/50">
                  {selectedInstallation?._playing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[1px] rounded-sm">
                      <span className="text-sm font-semibold text-white/90">
                        Running{" ".concat(".".repeat(runningDots + 1))}
                      </span>
                    </div>
                  )}
                  {/* Play trigger — left/middle of the bar */}
                  <NormalButton
                    title={t("generic.play")}
                    disabled={!selectedInstallation || launchingGuard}
                    onClick={PlayHandler}
                    className="flex-1 h-full p-1 pr-2 flex items-center !justify-start gap-2 text-sm disabled:opacity-50"
                  >
                    {currentInstallation && (
                      <>
                        <img
                          src={
                            INSTALLATION_ICONS.some((ii) => ii.id === currentInstallation.icon)
                              ? INSTALLATION_ICONS.find((ii) => ii.id === currentInstallation.icon)?.icon
                              : config.customIcons.some((ii) => ii.id === currentInstallation.icon)
                                ? `icons:${config.customIcons.find((ii) => ii.id === currentInstallation.icon)?.icon}`
                                : INSTALLATION_ICONS[0].icon
                          }
                          alt={t("generic.icon")}
                          className="h-full aspect-square object-cover rounded-sm"
                        />

                        <div className="flex-1 flex flex-col justify-around overflow-hidden text-start">
                          <p className="font-bold overflow-hidden whitespace-nowrap text-ellipsis">{currentInstallation.name}</p>
                          <div className="shrink-0 text-zinc-200/70 flex gap-2 items-start text-xs">
                            <p>{currentInstallation.version}</p>
                            <p>{t("features.mods.modsCount", { count: currentInstallation._modsCount })}</p>
                          </div>
                        </div>

                        {/* Play icon removed — entire bar is the play trigger */}
                      </>
                    )}
                  </NormalButton>

                  {/* Dropdown arrow at the far end */}
                  <ListboxButton className="shrink-0 h-full px-2 flex items-center justify-center cursor-pointer">
                    <PiCaretUpDuotone className={clsx("duration-200", open && "-rotate-180")} />
                  </ListboxButton>
                </div>

                <AnimatePresence>
                  {open && (
                    <ListboxOptions static className="absolute bottom-full left-0 w-full mb-1 z-600 select-none rounded-sm overflow-hidden">
                      <motion.ul
                        variants={DROPUP_MENU_WRAPPER_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="max-h-80 flex flex-col bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50 hover:shadow-none rounded-sm overflow-y-scroll text-sm"
                      >
                        {config.installations.toReversed().map((current) => (
                          <ListboxOption
                            key={current.id}
                            value={current.id}
                            as={motion.li}
                            variants={DROPUP_MENU_ITEM_VARIANTS}
                            className="w-full h-14 p-1 flex items-center justify-between gap-2 overflow-hidden odd:bg-zinc-800/30 even:bg-zinc-950/30 cursor-pointer text-start border border-transparent"
                          >
                            <img
                              src={
                                INSTALLATION_ICONS.some((ii) => ii.id === current.icon)
                                  ? INSTALLATION_ICONS.find((ii) => ii.id === current.icon)?.icon
                                  : config.customIcons.some((ii) => ii.id === current.icon)
                                    ? `icons:${config.customIcons.find((ii) => ii.id === current.icon)?.icon}`
                                    : INSTALLATION_ICONS[0].icon
                              }
                              alt={t("generic.icon")}
                              className="h-full aspect-square object-cover rounded-sm"
                            />

                            <div className="w-full overflow-hidden">
                              <p className="font-bold text-start overflow-hidden whitespace-nowrap text-ellipsis">{current.name}</p>

                              <div className="shrink-0 text-zinc-400 flex gap-2 items-start">
                                <p>{current.version}</p>
                                <p>{t("features.mods.modsCount", { count: current._modsCount })}</p>
                              </div>
                            </div>
                          </ListboxOption>
                        ))}
                      </motion.ul>
                    </ListboxOptions>
                  )}
                </AnimatePresence>
              </div>
            )}
          </Listbox>
        )}

        {/* Action buttons row */}
        <div className="w-full flex gap-1">
          <FormButton
            className="flex-1 h-8 flex items-center justify-center gap-1 text-xs"
            title={t("features.installations.backupInstallation")}
            disabled={!selectedInstallation}
            onClick={async () => {
              if (!selectedInstallation) return
              if (!(await window.api.pathsManager.checkPathExists(selectedInstallation.path))) return addNotification(t("features.backups.folderDoesntExists"), "error")
              makeInstallationBackup(selectedInstallation.id)
            }}
          >
            <PiBoxArrowDownDuotone />
            <span>{t("generic.backup")}</span>
          </FormButton>

          <FormLinkButton
            className="flex-1 h-8 flex items-center justify-center gap-1 text-xs"
            to={selectedInstallation ? `/installations/mods/${selectedInstallation.id}` : "/installations"}
            title={t("features.mods.manageMods")}
          >
            <PiWrenchDuotone />
            <span>{t("generic.mods")}</span>
          </FormLinkButton>

          <FormLinkButton
            className="flex-1 h-8 flex items-center justify-center gap-1 text-xs"
            title={t("features.installations.editInstallation")}
            to={selectedInstallation ? `/installations/edit/${selectedInstallation.id}` : "/installations/add"}
          >
            <PiPencilDuotone />
            <span>{t("generic.edit")}</span>
          </FormLinkButton>

          <FormLinkButton
            className="flex-1 h-8 flex items-center justify-center gap-1 text-xs"
            title={t("features.installations.addNewInstallation")}
            to="/installations/add"
          >
            <PiPlusCircleDuotone />
            <span>{t("generic.add")}</span>
          </FormLinkButton>
        </div>
      </div>
    </header>
  )
}

interface LinkContentProps {
  icon: ReactNode
  text: string
  desc: string
  link: string
}

function LinkContent({ icon, text, desc, link }: LinkContentProps): JSX.Element {
  const location = useLocation()

  function currentLocation(): boolean {
    if (link === "/") return location.pathname === "/"
    return location.pathname.startsWith(link)
  }

  return (
    <div className={clsx("w-full flex items-center gap-2 px-2 py-1 rounded-sm duration-100 hover:pl-3 border-l-4", currentLocation() ? "border-vs bg-vs/15" : "border-transparent")}>
      <span className="text-2xl text-zinc-400">{icon}</span>
      <div className="flex flex-col overflow-hidden whitespace-nowrap">
        <p className="font-bold text-sm overflow-hidden text-ellipsis">{text}</p>
        <p className="text-zinc-400 text-xs overflow-hidden text-ellipsis">{desc}</p>
      </div>
    </div>
  )
}

export default MainMenu
