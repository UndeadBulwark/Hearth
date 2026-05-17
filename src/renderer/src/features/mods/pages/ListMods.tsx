import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { PiDownloadDuotone, PiStarDuotone, PiChatCenteredTextDuotone, PiEraserDuotone, PiUserCircleDuotone } from "react-icons/pi"
import { FiExternalLink, FiLoader } from "react-icons/fi"
import clsx from "clsx"

import { useConfigContext, CONFIG_ACTIONS } from "@renderer/features/config/contexts/ConfigContext"
import { useNotificationsContext } from "@renderer/contexts/NotificationsContext"

import { useQueryMods } from "@renderer/features/mods/hooks/useQueryMods"
import { useGetInstalledMods } from "@renderer/features/mods/hooks/useGetInstalledMods"

import { FormButton, FormInputText } from "@renderer/components/ui/FormComponents"
import ScrollableContainer from "@renderer/components/ui/ScrollableContainer"
import { ListGroup, ListItem, ListWrapper } from "@renderer/components/ui/List"
import { StickyMenuWrapper, StickyMenuGroupWrapper, StickyMenuGroup, StickyMenuBreadcrumbs, GoBackButton, ReloadButton, GoToTopButton } from "@renderer/components/ui/StickyMenu"
import AuthorFilter from "@renderer/features/mods/components/AuthorFilter"
import VersionsFilter from "@renderer/features/mods/components/VersionsFilter"
import TagsFilter from "@renderer/features/mods/components/TagsFilter"
import SideFilter from "@renderer/features/mods/components/SideFilter"
import OrderFilter from "@renderer/features/mods/components/OrderFilter"
import InstalledFilter from "@renderer/features/mods/components/InstalledFilter"

function ListMods(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { config, configDispatch } = useConfigContext()
  const { addNotification } = useNotificationsContext()

  const DEFAULT_LOADED_MODS = 45

  const queryMods = useQueryMods()
  const getInstalledMods = useGetInstalledMods()

  const [modsList, setModsList] = useState<DownloadableModOnListType[]>([])
  const [visibleMods, setVisibleMods] = useState<number>(DEFAULT_LOADED_MODS)

  const [installation, setInstallation] = useState<InstallationType | undefined>(undefined)

  const [installationInstalledMods, setInstallationInstalledMods] = useState<InstalledModType[] | undefined>([])

  const [onlyFav, setOnlyFav] = useState<boolean>(false)
  const [textFilter, setTextFilter] = useState<string>("")
  const [authorFilter, setAuthorFilter] = useState<DownloadableModAuthorType>({ userid: "", name: "" })
  const [versionsFilter, setVersionsFilter] = useState<DownloadableModGameVersionType[]>([])
  const [tagsFilter, setTagsFilter] = useState<DownloadableModTagType[]>([])
  const [sideFilter, setSideFilter] = useState<string>("any")
  const [installedFilter, setInstalledFilter] = useState<string>("all")
  const [orderBy, setOrderBy] = useState<string>("follows")
  const [orderByOrder, setOrderByOrder] = useState<string>("desc")

  const [searching, setSearching] = useState<boolean>(true)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const handleScroll = (): void => {
    if (!scrollRef.current) return
    const { scrollTop, clientHeight, scrollHeight } = scrollRef.current
    if (scrollTop + clientHeight >= scrollHeight - (clientHeight / 2 + 100)) setVisibleMods((prev) => prev + 10)
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.addEventListener("scroll", handleScroll)

    return (): void => {
      if (scrollRef.current) scrollRef.current.removeEventListener("scroll", handleScroll)
    }
  }, [])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      await triggerQueryMods()
      timeoutRef.current = null
    }, 400)

    return (): void => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [textFilter, authorFilter, versionsFilter, tagsFilter, sideFilter, installedFilter, onlyFav, orderBy, orderByOrder])

  useEffect(() => {
    setInstallation(config.installations.find((i) => i.id === config.lastUsedInstallation))
  }, [config.lastUsedInstallation])

  useEffect(() => {
    if (!installation) return setInstallationInstalledMods([])
    triggerGetInstalledMods()
  }, [installation])

  useEffect(() => {
    if (installedFilter !== "all") triggerQueryMods(false)
  }, [installationInstalledMods])

  async function triggerQueryMods(resetScroll: boolean = true): Promise<void> {
    if (!installationInstalledMods) {
      window.api.utils.logMessage("info", "[front] [mods] [features/mods/pages/ListMods.tsx] [triggerQueryMods] Installed mods not loaded yet, skipping query")
      return
    }

    window.api.utils.logMessage("info", "[front] [mods] [features/mods/pages/ListMods.tsx] [triggerQueryMods] Installed mods loaded, querying mods")

    setSearching(true)

    let mods = await queryMods({
      textFilter,
      authorFilter,
      versionsFilter,
      tagsFilter,
      orderBy,
      orderByOrder,
      onFinish: () => {
        if (resetScroll) {
          scrollRef.current?.scrollTo({ top: 0 })
          setVisibleMods(DEFAULT_LOADED_MODS)
        }
      }
    })

    if (sideFilter !== "any") mods = mods.filter((mod) => mod.side === sideFilter)

    if (installedFilter === "installed")
      mods = mods.filter((mod) => installationInstalledMods.some((iMod) => mod.modidstrs.some((modidstr) => modidstr === iMod.modid.toLocaleLowerCase() || modidstr === iMod.modid)))
    if (installedFilter === "not-installed")
      mods = mods.filter((mod) => !installationInstalledMods.some((iMod) => mod.modidstrs.some((modidstr) => modidstr === iMod.modid.toLocaleLowerCase() || modidstr === iMod.modid)))

    if (onlyFav) mods = mods.filter((mod) => config.favMods.some((fm) => fm === mod.modid))

    setModsList(mods)
    setSearching(false)
  }

  async function triggerGetInstalledMods(): Promise<void> {
    if (!installation) return addNotification(t("features.installations.noInstallationSelected"), "error")

    const mods = await getInstalledMods({
      path: installation.path
    })

    const totalMods = mods.errors.length + mods.mods.length
    configDispatch({ type: CONFIG_ACTIONS.EDIT_INSTALLATION, payload: { id: installation.id, updates: { _modsCount: totalMods } } })

    setInstallationInstalledMods(mods.mods)
  }

  function clearFilters(): void {
    setTextFilter("")
    setAuthorFilter({ userid: "", name: "" })
    setVersionsFilter([])
    setTagsFilter([])
    setSideFilter("any")
    setInstalledFilter("all")
    setOnlyFav(false)
  }

  return (
    <ScrollableContainer ref={scrollRef}>
      <div className="w-full min-h-[101%] flex flex-col justify-center gap-2">
        <StickyMenuWrapper scrollRef={scrollRef}>
          <StickyMenuGroupWrapper>
            <StickyMenuGroup>
              <GoBackButton to="/" />

              <ReloadButton
                onClick={() => {
                  if (!searching) triggerQueryMods()
                }}
                reloading={searching}
              />
            </StickyMenuGroup>

            <StickyMenuBreadcrumbs breadcrumbs={[{ name: t("breadcrumbs.mods"), to: "/mods" }]} />

            <StickyMenuGroup>
              <GoToTopButton scrollRef={scrollRef} />
            </StickyMenuGroup>
          </StickyMenuGroupWrapper>

          <StickyMenuGroupWrapper type="centered">
            <StickyMenuGroup>
              <FormInputText placeholder={t("generic.text")} value={textFilter} onChange={(e) => setTextFilter(e.target.value)} className="w-40 h-8" />

              <AuthorFilter authorFilter={authorFilter} setAuthorFilter={setAuthorFilter} size="w-40 h-8" />

              <VersionsFilter versionsFilter={versionsFilter} setVersionsFilter={setVersionsFilter} size="w-40 h-8" />

              <TagsFilter tagsFilter={tagsFilter} setTagsFilter={setTagsFilter} size="w-40 h-8" />

              <SideFilter sideFilter={sideFilter} setSideFilter={setSideFilter} size="w-40 h-8" />

              <InstalledFilter installedFilter={installedFilter} setInstalledFilter={setInstalledFilter} size="w-40 h-8" />

              <FormButton title={t("features.mods.onlyFavMods")} onClick={() => setOnlyFav((prev) => !prev)} className="w-8 h-8 text-lg" type={onlyFav ? "warn" : "normal"}>
                <PiStarDuotone />
              </FormButton>

              <OrderFilter orderBy={orderBy} setOrderBy={setOrderBy} orderByOrder={orderByOrder} setOrderByOrder={setOrderByOrder} />

              <FormButton title={t("generic.clearFilter")} onClick={() => clearFilters()} className="w-8 h-8 text-lg">
                <PiEraserDuotone />
              </FormButton>
            </StickyMenuGroup>
          </StickyMenuGroupWrapper>
        </StickyMenuWrapper>

        <ListWrapper className="my-auto">
          <ListGroup>
            {modsList.length < 1 ? (
              <div className="w-full flex flex-col items-center justify-center gap-2 rounded-sm p-4">
                {searching ? <FiLoader className="animate-spin text-4xl text-zinc-400" /> : t("features.mods.noMatchingFilters")}
              </div>
            ) : (
              modsList.slice(0, visibleMods).map((mod) => {
                const isInstalled = installationInstalledMods?.some((iMod) => mod.modidstrs.some((modidstr) => modidstr === iMod.modid.toLocaleLowerCase() || modidstr === iMod.modid))
                return (
                  <ListItem
                    key={mod.modid}
                    onClick={() => navigate(`/mods/${mod.modid}`)}
                    className="group"
                  >
                    <div className="flex items-center gap-3 p-2 cursor-pointer">
                      <img
                        src={mod.logo ? `${mod.logo}` : "https://mods.vintagestory.at/web/img/mod-default.png"}
                        alt={mod.name}
                        className="w-12 h-12 object-cover object-top rounded-sm shrink-0"
                      />

                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="font-bold overflow-hidden whitespace-nowrap text-ellipsis" title={mod.name}>
                            {mod.name}
                          </p>
                          {isInstalled && (
                            <span className="px-1.5 py-0.5 rounded-sm bg-green-900/30 text-green-300 text-[10px] font-medium shrink-0">
                              {t("features.mods.installedShort")}
                            </span>
                          )}
                          <span className={clsx("px-1.5 py-0.5 rounded-sm text-[10px] font-medium shrink-0", mod.side === "server" && "bg-blue-900/30 text-blue-300", mod.side === "client" && "bg-green-900/30 text-green-300", mod.side === "both" && "bg-purple-900/30 text-purple-300")}>
                            {mod.side}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 overflow-hidden whitespace-nowrap text-ellipsis" title={mod.summary ?? ""}>
                          {mod.summary}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <PiUserCircleDuotone className="opacity-50" />
                            {mod.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <PiDownloadDuotone className="opacity-50" />
                            {Number(mod.downloads) > 10000 ? `${Math.floor(Number(mod.downloads) / 1000)}K` : Number(mod.downloads)}
                          </span>
                          <span className="flex items-center gap-1">
                            <PiStarDuotone className="opacity-50" />
                            {Number(mod.follows) > 10000 ? `${Math.floor(Number(mod.follows) / 1000)}K` : Number(mod.follows)}
                          </span>
                          <span className="flex items-center gap-1">
                            <PiChatCenteredTextDuotone className="opacity-50" />
                            {Number(mod.comments) > 10000 ? `${Math.floor(Number(mod.comments) / 1000)}K` : Number(mod.comments)}
                          </span>
                          <span className="text-zinc-600">
                            {new Date(mod.lastreleased).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 duration-200">
                        <FormButton
                          title={t("generic.favorite")}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (config.favMods.some((modid) => modid === mod.modid)) {
                              configDispatch({ type: CONFIG_ACTIONS.REMOVE_FAV_MOD, payload: { modid: mod.modid } })
                            } else {
                              configDispatch({ type: CONFIG_ACTIONS.ADD_FAV_MOD, payload: { modid: mod.modid } })
                            }
                          }}
                          type={config.favMods.some((modid) => modid === mod.modid) ? "warn" : "normal"}
                          className="w-7 h-7 text-base"
                        >
                          <PiStarDuotone />
                        </FormButton>

                        <FormButton
                          title={t("features.mods.openOnTheModDB")}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.api.utils.openOnBrowser(`https://mods.vintagestory.at/show/mod/${mod.assetid}`)
                          }}
                          className="w-7 h-7 text-base"
                        >
                          <FiExternalLink />
                        </FormButton>
                      </div>
                    </div>
                  </ListItem>
                )
              })
            )}
          </ListGroup>
        </ListWrapper>
      </div>
    </ScrollableContainer>
  )
}

export default ListMods
