import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "motion/react"
import { PiDownloadDuotone, PiBoxArrowDownDuotone, PiXCircleDuotone, PiBoxArrowUpDuotone } from "react-icons/pi"
import clsx from "clsx"

import { useTaskContext } from "@renderer/contexts/TaskManagerContext"

import ScrollableContainer from "@renderer/components/ui/ScrollableContainer"
import { ListGroup, ListItem, ListWrapper } from "@renderer/components/ui/List"
import { NormalButton } from "@renderer/components/ui/Buttons"
import { StickyMenuWrapper, StickyMenuGroupWrapper, StickyMenuGroup, StickyMenuBreadcrumbs, GoBackButton, GoToTopButton } from "@renderer/components/ui/StickyMenu"

const NAME_BY_TYPE = {
  download: "components.tasksMenu.downloading",
  extract: "components.tasksMenu.extracting",
  compress: "components.tasksMenu.compressing",
  runtime: "components.tasksMenu.runtimeDownload"
}

const FONT_COLOR_TYPES = {
  pending: "text-vsl",
  "in-progress": "text-yellow-400",
  failed: "text-red-800",
  completed: "text-lime-600"
}

const ICON_TYPES = {
  download: <PiDownloadDuotone />,
  extract: <PiBoxArrowUpDuotone />,
  compress: <PiBoxArrowDownDuotone />,
  runtime: <PiDownloadDuotone />
}

function DownloadsPage(): JSX.Element {
  const { t } = useTranslation()
  const { tasks, removeTask } = useTaskContext()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  return (
    <ScrollableContainer ref={scrollRef}>
      <div className="min-h-full flex flex-col items-center justify-center gap-2">
        <StickyMenuWrapper scrollRef={scrollRef}>
          <StickyMenuGroupWrapper>
            <StickyMenuGroup>
              <GoBackButton to="/" />
            </StickyMenuGroup>

            <StickyMenuBreadcrumbs breadcrumbs={[{ name: t("breadcrumbs.downloads"), to: "/downloads" }]} />

            <StickyMenuGroup>
              <GoToTopButton scrollRef={scrollRef} />
            </StickyMenuGroup>
          </StickyMenuGroupWrapper>
        </StickyMenuWrapper>

        <ListWrapper className="max-w-[50rem] w-full my-auto">
          <ListGroup>
            {tasks.length < 1 ? (
              <ListItem>
                <div className="w-full flex items-center justify-center p-4">
                  <p className="text-sm font-bold">{t("components.tasksMenu.noTasksAvailable")}</p>
                </div>
              </ListItem>
            ) : (
              <AnimatePresence>
                {tasks.map((task) => (
                  <ListItem key={task.id}>
                    <div className="w-full flex flex-col gap-1 p-2">
                      <div className="w-full flex items-center justify-between gap-2">
                        <div className="w-full flex items-center gap-2">
                          <p className={clsx("text-xl", FONT_COLOR_TYPES[task.status])}>{ICON_TYPES[task.type]}</p>
                          <div className="flex flex-col items-start justify-center">
                            <p className="font-bold text-sm">{`${t(NAME_BY_TYPE[task.type])}`}</p>
                            <p className="text-xs text-zinc-400 line-clamp-2">{task.desc}</p>
                            {task.status === "failed" && <p className={clsx("text-xs", FONT_COLOR_TYPES["failed"])}>{t("components.tasksMenu.error")}</p>}
                          </div>
                        </div>
                        {(task.status === "completed" || task.status === "failed") && (
                          <NormalButton className="p-1 text-zinc-400" title={t("generic.discard")} onClick={() => removeTask(task.id)}>
                            <PiXCircleDuotone />
                          </NormalButton>
                        )}
                      </div>
                      {task.status === "in-progress" && (
                        <div className="w-full h-1 bg-zinc-900 rounded-full">
                          <motion.div
                            className={`h-full bg-vs rounded-full`}
                            initial={{ width: `${task.progress}%` }}
                            animate={{ width: `${task.progress}%` }}
                            transition={{ ease: "easeInOut", duration: 0.2 }}
                          ></motion.div>
                        </div>
                      )}
                    </div>
                  </ListItem>
                ))}
              </AnimatePresence>
            )}
          </ListGroup>
        </ListWrapper>
      </div>
    </ScrollableContainer>
  )
}

export default DownloadsPage
