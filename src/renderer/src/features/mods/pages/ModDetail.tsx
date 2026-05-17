import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { PiDownloadDuotone, PiStarDuotone, PiChatCenteredTextDuotone, PiUserCircleDuotone, PiArrowClockwiseDuotone, PiCaretDownDuotone } from "react-icons/pi"
import { FiExternalLink, FiLoader } from "react-icons/fi"
import clsx from "clsx"
import { AnimatePresence, motion } from "motion/react"
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react"

import { useConfigContext, CONFIG_ACTIONS } from "@renderer/features/config/contexts/ConfigContext"
import { useNotificationsContext } from "@renderer/contexts/NotificationsContext"

import { useQueryMod } from "@renderer/features/mods/hooks/useQueryMod"
import { useInstallMod } from "@renderer/features/mods/hooks/useInstallMod"
import { useGetInstalledMods } from "@renderer/features/mods/hooks/useGetInstalledMods"

import { FormButton } from "@renderer/components/ui/FormComponents"
import ScrollableContainer from "@renderer/components/ui/ScrollableContainer"
import { TableBody, TableBodyRow, TableCell, TableHead, TableHeadRow, TableWrapper } from "@renderer/components/ui/Table"
import { StickyMenuWrapper, StickyMenuGroupWrapper, StickyMenuGroup, StickyMenuBreadcrumbs, GoBackButton, GoToTopButton } from "@renderer/components/ui/StickyMenu"
import { DROPUP_MENU_ITEM_VARIANTS, DROPUP_MENU_WRAPPER_VARIANTS } from "@renderer/utils/animateVariants"

function ModDetail(): JSX.Element {
  const { t } = useTranslation()
  const { config, configDispatch } = useConfigContext()
  const { addNotification } = useNotificationsContext()

  const { modid } = useParams<{ modid: string }>()
  const modIdNum = Number(modid)

  const queryMod = useQueryMod()
  const installMod = useInstallMod()
  const getInstalledMods = useGetInstalledMods()

  const [mod, setMod] = useState<DownloadableModType | null>(null)
  const [loading, setLoading] = useState(true)
  const [installation, setInstallation] = useState<InstallationType | undefined>(undefined)
  const [installedMods, setInstalledMods] = useState<InstalledModType[]>([])
  const [oldMod, setOldMod] = useState<InstalledModType | undefined>(undefined)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!modid) return
    setLoading(true)
    ;(async (): Promise<void> => {
      const data = await queryMod({ modid: modIdNum })
      setMod(data || null)
      setLoading(false)
    })()
  }, [modid])

  useEffect(() => {
    setInstallation(config.installations.find((i) => i.id === config.lastUsedInstallation))
  }, [config.lastUsedInstallation, config.installations])

  useEffect(() => {
    if (!installation) {
      setInstalledMods([])
      return
    }
    ;(async (): Promise<void> => {
      const res = await getInstalledMods({ path: installation.path })
      setInstalledMods(res.mods)
    })()
  }, [installation])

  useEffect(() => {
    if (!mod || !installedMods.length) {
      setOldMod(undefined)
      return
    }
    const found = installedMods.find((iMod) =>
      mod.modidstrs?.some((modidstr) => modidstr === iMod.modid.toLocaleLowerCase() || modidstr === iMod.modid)
    )
    setOldMod(found)
  }, [mod, installedMods])

  async function handleInstall(release: DownloadableModReleaseType): Promise<void> {
    if (!installation) return addNotification(t("features.installations.noInstallationSelected"), "error")
    if (installation._backuping || installation._restoringBackup) return addNotification(t("features.mods.cantUpdateWhileinUse"), "error")

    if (!mod) return

    installMod({
      mod,
      path: installation.path,
      outName: installation.name,
      release,
      oldMod,
      onFinish: async () => {
        const res = await getInstalledMods({ path: installation.path })
        setInstalledMods(res.mods)
        addNotification(t("features.mods.modSuccessfullyInstalled", { mod: mod.name }), "success")
      }
    })
  }

  function getReleaseType(release: DownloadableModReleaseType): "success" | "warn" | "error" {
    if (!installation) return "error"
    if (release.tags.includes(`${installation.version}`)) return "success"
    if (release.tags.some((tag) => tag.startsWith(`${installation.version.split(".").slice(0, 2).join(".")}`))) return "warn"
    return "error"
  }

  function getReleaseTitle(release: DownloadableModReleaseType): string {
    if (!installation) return ""
    if (release.tags.includes(`${installation.version}`)) return t("features.mods.worksOnTheVersion")
    if (release.tags.some((tag) => tag.startsWith(`${installation.version.split(".").slice(0, 2).join(".")}`))) return t("features.mods.shouldWorkOnTheVersion")
    return t("features.mods.probablyDontWorkOnTheVersion")
  }

  const isFav = mod ? config.favMods.some((fm) => fm === mod.modid) : false

  const resolveUrl = (value: string | null | undefined): string => {
    if (!value) return "https://mods.vintagestory.at/web/img/mod-default.png"
    if (value.startsWith("http")) return value
    return `https://mods.vintagestory.at/${value}`
  }

  // Detect common URLs buried inside mod.text HTML that the API doesn't surface top-level
  const extractedLinks = (() => {
    const links: { homepage?: string; sourcecode?: string; discord?: string; patreon?: string; kofi?: string; youtube?: string; curseforge?: string } = {}
    if (!mod?.text) return links
    const html = mod.text

    // Discord
    const discordMatch = html.match(/discord\.gg\/([a-zA-Z0-9-_]+)/i) || html.match(/discord\.com\/invite\/([a-zA-Z0-9-_]+)/i)
    if (discordMatch) links.discord = `https://discord.gg/${discordMatch[1]}`

    // GitHub
    const githubMatch = html.match(/github\.com\/([a-zA-Z0-9-_]+\/[a-zA-Z0-9-_.]+)/i)
    if (githubMatch) links.sourcecode = `https://github.com/${githubMatch[1]}`

    // YouTube
    const youtubeMatch = html.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i) || html.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i)
    if (youtubeMatch) links.youtube = `https://www.youtube.com/watch?v=${youtubeMatch[1]}`

    // Ko-fi
    const kofiMatch = html.match(/ko-fi\.com\/(?!widget)([a-zA-Z0-9_]+)/i)
    if (kofiMatch) links.kofi = `https://ko-fi.com/${kofiMatch[1]}`

    // Patreon
    const patreonMatch = html.match(/patreon\.com\/([a-zA-Z0-9_]+)/i)
    if (patreonMatch) links.patreon = `https://www.patreon.com/${patreonMatch[1]}`

    // CurseForge
    const curseforgeMatch = html.match(/curseforge\.com\/projects\/([a-zA-Z0-9_-]+)/i) || html.match(/www\.curseforge\.com\/projects\/([a-zA-Z0-9_-]+)/i)
    if (curseforgeMatch) links.curseforge = `https://www.curseforge.com/projects/${curseforgeMatch[1]}`

    return links
  })()

  // Normalize top-level URL fields (treat empty strings as missing)
  const topLinks = {
    homepage: mod?.homepageurl?.trim() || undefined,
    sourcecode: mod?.sourcecodeurl?.trim() || undefined,
    issuetracker: mod?.issuetrackerurl?.trim() || undefined,
    wiki: mod?.wikiurl?.trim() || undefined,
    trailer: mod?.trailervideourl?.trim() || undefined
  }

  return (
    <ScrollableContainer ref={scrollRef}>
      <div className="w-full min-h-[101%] flex flex-col gap-2">
        <StickyMenuWrapper scrollRef={scrollRef}>
          <StickyMenuGroupWrapper>
            <StickyMenuGroup>
              <GoBackButton to="/mods" />
            </StickyMenuGroup>

            <StickyMenuBreadcrumbs breadcrumbs={[
              { name: t("breadcrumbs.mods"), to: "/mods" },
              { name: mod?.name || "...", to: `/mods/${modid}` }
            ]} />

            <StickyMenuGroup>
              <GoToTopButton scrollRef={scrollRef} />
            </StickyMenuGroup>
          </StickyMenuGroupWrapper>
        </StickyMenuWrapper>

        {loading ? (
          <div className="w-full flex flex-col items-center justify-center gap-2 rounded-sm p-8">
            <FiLoader className="animate-spin text-4xl text-zinc-400" />
          </div>
        ) : !mod ? (
          <div className="w-full flex flex-col items-center justify-center gap-2 rounded-sm p-8 text-zinc-400">
            <p className="text-xl">{t("features.mods.noModFound")}</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4 p-2">
            {/* Header */}
            <div className="relative w-full flex gap-4 rounded-sm p-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50">
              <img
                src={resolveUrl(mod.logofile)}
                alt={mod.name}
                className="w-24 h-24 object-cover rounded-sm shrink-0"
              />
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-2xl font-bold">{mod.name}</h1>
                  <div className="flex gap-2">
                    <FormButton
                      title={t("generic.favorite")}
                      onClick={() => {
                        if (isFav) {
                          configDispatch({ type: CONFIG_ACTIONS.REMOVE_FAV_MOD, payload: { modid: mod.modid } })
                        } else {
                          configDispatch({ type: CONFIG_ACTIONS.ADD_FAV_MOD, payload: { modid: mod.modid } })
                        }
                      }}
                      type={isFav ? "warn" : "normal"}
                      className="w-8 h-8 text-lg"
                    >
                      <PiStarDuotone />
                    </FormButton>
                    <FormButton
                      title={t("features.mods.openOnTheModDB")}
                      onClick={() => window.api.utils.openOnBrowser(`https://mods.vintagestory.at/show/mod/${mod.assetid}`)}
                      className="w-8 h-8 text-lg"
                    >
                      <FiExternalLink />
                    </FormButton>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                  <span className="flex items-center gap-1">
                    <PiUserCircleDuotone className="opacity-50" />
                    {mod.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <PiDownloadDuotone className="opacity-50" />
                    {mod.downloads}
                  </span>
                  <span className="flex items-center gap-1">
                    <PiStarDuotone className="opacity-50" />
                    {mod.follows}
                  </span>
                  <span className="flex items-center gap-1">
                    <PiChatCenteredTextDuotone className="opacity-50" />
                    {mod.comments}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {mod.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-sm bg-zinc-800 text-xs text-zinc-300">
                      {tag}
                    </span>
                  ))}
                  <span className={clsx("px-2 py-0.5 rounded-sm text-xs font-medium", mod.side === "server" && "bg-blue-900/30 text-blue-300", mod.side === "client" && "bg-green-900/30 text-green-300", mod.side === "both" && "bg-purple-900/30 text-purple-300")}>
                    {mod.side}
                  </span>
                </div>
              </div>
            </div>

            {/* Installation selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{t("features.mods.installInto")}:</span>
              <Listbox
                value={installation?.id || ""}
                onChange={(id: string) => {
                  const inst = config.installations.find((i) => i.id === id)
                  if (inst) {
                    configDispatch({ type: CONFIG_ACTIONS.SET_LAST_USED_INSTALLATION, payload: inst.id })
                  }
                }}
              >
                {({ open }) => (
                  <div className="relative">
                    <ListboxButton className="w-64 h-8 px-2 flex items-center justify-between gap-2 rounded-sm bg-zinc-950/80 border border-zinc-400/5 text-sm cursor-pointer">
                      <span className="overflow-hidden whitespace-nowrap text-ellipsis">
                        {installation ? installation.name : t("features.installations.noInstallationSelected")}
                      </span>
                      <PiCaretDownDuotone className={clsx("duration-200 shrink-0", open && "rotate-180")} />
                    </ListboxButton>
                    <AnimatePresence>
                      {open && (
                        <ListboxOptions static anchor="bottom" className="w-[var(--button-width)] z-600 translate-y-1 select-none rounded-sm overflow-hidden">
                          <motion.ul
                            variants={DROPUP_MENU_WRAPPER_VARIANTS}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="max-h-64 flex flex-col bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50 hover:shadow-none rounded-sm overflow-y-scroll text-sm"
                          >
                            {config.installations.length === 0 && (
                              <div className="w-full p-2 text-zinc-400 text-center text-xs">{t("features.installations.noInstallationsFound")}</div>
                            )}
                            {config.installations.map((inst) => (
                              <ListboxOption
                                key={inst.id}
                                value={inst.id}
                                as={motion.li}
                                variants={DROPUP_MENU_ITEM_VARIANTS}
                                className="w-full h-8 px-2 flex items-center gap-2 overflow-hidden odd:bg-zinc-800/30 even:bg-zinc-950/30 cursor-pointer text-start border border-transparent"
                              >
                                <span className="overflow-hidden whitespace-nowrap text-ellipsis">{inst.name}</span>
                              </ListboxOption>
                            ))}
                          </motion.ul>
                        </ListboxOptions>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </Listbox>
              {oldMod && (
                <span className="text-xs text-zinc-400">
                  {t("features.mods.installedVersion")}: v{oldMod.version}
                </span>
              )}
            </div>

            {/* Description */}
            {mod.text && (
              <div className="rounded-sm p-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50">
                <h2 className="text-lg font-bold mb-2">{t("features.mods.description")}</h2>
                <div
                  className="text-sm text-zinc-300 max-w-none"
                  style={{
                    /* Tame mod-provided HTML: cap font sizes, force images inside container, reset backgrounds */
                  }}
                  dangerouslySetInnerHTML={{
                    __html: mod.text
                      // Force all images to max-width 100% and remove any background
                      .replace(/<img\b/g, '<img style="max-width:100%;height:auto;display:block;margin:4px 0;background:none;border:none;"')
                      // Remove any background styles from div/span/p that mod authors might set
                      .replace(/background(?:-\w+)?\s*:\s*[^;!}]+/gi, '')
                      // Clamp any excessively large font sizes
                      .replace(/font-size\s*:\s*([\d.]+)(px|pt|em|rem)/gi, (_match, size, unit) => {
                        const num = parseFloat(size)
                        const clamped = unit === 'px' || unit === 'pt' ? Math.min(num, 24) : Math.min(num, 1.5)
                        return `font-size: ${clamped}${unit}`
                      })
                  }}
                />
              </div>
            )}

            {/* Screenshots */}
            {mod.screenshots && mod.screenshots.length > 0 && (
              <div className="rounded-sm p-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50">
                <h2 className="text-lg font-bold mb-2">{t("features.mods.screenshots")}</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mod.screenshots.map((ss) => (
                    <img
                      key={ss.fileid}
                      src={resolveUrl(ss.mainfile)}
                      alt={ss.filename}
                      className="h-40 rounded-sm object-cover shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* External links — merge top-level fields + detected links from description */}
            {(topLinks.homepage || topLinks.sourcecode || topLinks.issuetracker || topLinks.wiki || topLinks.trailer || extractedLinks.homepage || extractedLinks.sourcecode || extractedLinks.discord || extractedLinks.patreon || extractedLinks.kofi || extractedLinks.youtube || extractedLinks.curseforge) && (
              <div className="rounded-sm p-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50">
                <h2 className="text-lg font-bold mb-2">{t("features.mods.externalLinks")}</h2>
                <div className="flex flex-wrap gap-2">
                  {(topLinks.homepage || extractedLinks.homepage) && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(topLinks.homepage || extractedLinks.homepage!)} className="text-sm" title={t("features.mods.homepage")}>
                      {t("features.mods.homepage")}
                    </FormButton>
                  )}
                  {(topLinks.sourcecode || extractedLinks.sourcecode) && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(topLinks.sourcecode || extractedLinks.sourcecode!)} className="text-sm" title={t("features.mods.sourceCode")}>
                      {t("features.mods.sourceCode")}
                    </FormButton>
                  )}
                  {topLinks.issuetracker && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(topLinks.issuetracker!)} className="text-sm" title={t("features.mods.issueTracker")}>
                      {t("features.mods.issueTracker")}
                    </FormButton>
                  )}
                  {topLinks.wiki && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(topLinks.wiki!)} className="text-sm" title={t("features.mods.wiki")}>
                      {t("features.mods.wiki")}
                    </FormButton>
                  )}
                  {(topLinks.trailer || extractedLinks.youtube) && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(topLinks.trailer || extractedLinks.youtube!)} className="text-sm" title={t("features.mods.trailer")}>
                      {t("features.mods.trailer")}
                    </FormButton>
                  )}
                  {extractedLinks.discord && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(extractedLinks.discord!)} className="text-sm" title={t("generic.discord")}>
                      {t("generic.discord")}
                    </FormButton>
                  )}
                  {extractedLinks.patreon && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(extractedLinks.patreon!)} className="text-sm" title={t("generic.donate")}>
                      {t("generic.donate")}
                    </FormButton>
                  )}
                  {extractedLinks.kofi && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(extractedLinks.kofi!)} className="text-sm" title="Ko-fi">
                      Ko-fi
                    </FormButton>
                  )}
                  {extractedLinks.curseforge && (
                    <FormButton onClick={() => window.api.utils.openOnBrowser(extractedLinks.curseforge!)} className="text-sm" title="CurseForge">
                      CurseForge
                    </FormButton>
                  )}
                </div>
              </div>
            )}

            {/* Releases */}
            <div className="rounded-sm p-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50">
              <h2 className="text-lg font-bold mb-2">{t("features.mods.releases")}</h2>
              <TableWrapper>
                <TableHead>
                  <TableHeadRow>
                    <TableCell className="w-2/12">{t("generic.version")}</TableCell>
                    <TableCell className="w-3/12">{t("generic.releaseDate")}</TableCell>
                    <TableCell className="w-4/12">{t("features.versions.labelGameVersions")}</TableCell>
                    <TableCell className="w-3/12">{t("generic.actions")}</TableCell>
                  </TableHeadRow>
                </TableHead>
                <TableBody className="max-h-[24rem]">
                  {mod.releases.map((release) => (
                    <TableBodyRow key={release.releaseid}>
                      <TableCell className="w-2/12">{release.modversion}</TableCell>
                      <TableCell className="w-3/12">{new Date(release.created).toLocaleDateString()}</TableCell>
                      <TableCell className="w-4/12 overflow-hidden whitespace-nowrap text-ellipsis">
                        <input type="text" value={release.tags.join(", ")} readOnly className="w-full bg-transparent outline-hidden text-center text-xs" />
                      </TableCell>
                      <TableCell className="w-3/12 flex gap-2 items-center justify-center text-lg">
                        <FormButton
                          disabled={oldMod?.version === release.modversion}
                          onClick={() => handleInstall(release)}
                          className="w-7 h-7"
                          type={getReleaseType(release)}
                          title={getReleaseTitle(release)}
                        >
                          <div className={clsx("w-full h-full rounded-sm flex items-center justify-center", oldMod?._updatableTo === release.modversion && "bg-lime-600/15")}>
                            {oldMod ? <PiArrowClockwiseDuotone /> : <PiDownloadDuotone />}
                          </div>
                        </FormButton>
                      </TableCell>
                    </TableBodyRow>
                  ))}
                </TableBody>
              </TableWrapper>
            </div>
          </div>
        )}
      </div>
    </ScrollableContainer>
  )
}

export default ModDetail
