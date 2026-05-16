import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PiFloppyDiskBackDuotone, PiTrashDuotone, PiUserDuotone, PiXCircleDuotone, PiPlusCircleDuotone } from "react-icons/pi"
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react"
import { AnimatePresence, motion } from "motion/react"
import clsx from "clsx"

import { useNotificationsContext } from "@renderer/contexts/NotificationsContext"
import { CONFIG_ACTIONS, useConfigContext } from "@renderer/features/config/contexts/ConfigContext"

import {
  ButtonsWrapper,
  FormBody,
  FormButton,
  FormFieldDescription,
  FormFieldGroup,
  FormFieldGroupWithDescription,
  FormGroupWrapper,
  FormHead,
  FormInputPassword,
  FormInputText,
  FormLabel,
  FromGroup,
  FromWrapper
} from "@renderer/components/ui/FormComponents"
import PopupDialogPanel from "@renderer/components/ui/PopupDialogPanel"
import { DROPUP_MENU_WRAPPER_VARIANTS, DROPUP_MENU_ITEM_VARIANTS } from "@renderer/utils/animateVariants"

function AccountSelector(): JSX.Element {
  const { t } = useTranslation()
  const { config, configDispatch } = useConfigContext()
  const { addNotification } = useNotificationsContext()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twofacode, setTwofacode] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const [logInOpen, setLogInOpen] = useState(false)
  const [removeAccountId, setRemoveAccountId] = useState<string | null>(null)

  const selectedAccount = useMemo(() => {
    return config.accounts.find((a) => a.id === config.lastUsedAccountId) ?? null
  }, [config.accounts, config.lastUsedAccountId])

  async function handleLogin(): Promise<void> {
    setLoggingIn(true)
    addNotification(t("features.config.loggingin"), "info")

    try {
      const preLogin = await window.api.netManager.postUrl("https://auth3.vintagestory.at/v2/gamelogin", { email, password })

      if (preLogin["valid"] == 0) {
        const reason = preLogin["reason"]

        if (reason == "requiretotpcode") {
          const fullLogin = await window.api.netManager.postUrl("https://auth3.vintagestory.at/v2/gamelogin", { email, password, preLoginToken: preLogin["prelogintoken"], twofacode })

          if (fullLogin["valid"] == 0 && fullLogin["reason"] == "wrongtotpcode") {
            addNotification(t("features.config.wrongtwofa"), "error")
            setLoggingIn(false)
            return
          }

          await saveLogin(fullLogin)
        } else if (reason == "invalidemailorpassword") {
          addNotification(t("features.config.invalidEmailPass"), "error")
          setLoggingIn(false)
        }
      } else {
        await saveLogin(preLogin)
      }
    } catch (err) {
      addNotification(t("notifications.body.errorExecutingGame"), "error")
      setLoggingIn(false)
    }
  }

  async function saveLogin(data: object): Promise<void> {
    const newAccount: AccountType = {
      email: email,
      playerName: data["playername"],
      playerUid: data["uid"],
      playerEntitlements: data["entitlements"],
      sessionKey: data["sessionkey"],
      sessionSignature: data["sessionsignature"],
      mptoken: data["mptoken"],
      hostGameServer: data["hasgameserver"]
    }

    const result = await window.api.accountManager.saveAccount(newAccount)

    configDispatch({ type: CONFIG_ACTIONS.ADD_ACCOUNT, payload: result.metadata })
    configDispatch({ type: CONFIG_ACTIONS.SET_LAST_USED_ACCOUNT_ID, payload: result.id })

    if (config.accounts.length >= 10) {
      addNotification(t("features.config.accountLimitReached"), "warning")
    }

    addNotification(t("features.config.accountAdded", { user: newAccount.playerName }), "success")
    setLoggingIn(false)
    setLogInOpen(false)
    setEmail("")
    setPassword("")
    setTwofacode("")
  }

  async function handleRemoveAccount(): Promise<void> {
    if (!removeAccountId) return
    await window.api.accountManager.removeAccount(removeAccountId)
    configDispatch({ type: CONFIG_ACTIONS.REMOVE_ACCOUNT, payload: { id: removeAccountId } })
    addNotification(t("features.config.accountRemoved"), "success")
    setRemoveAccountId(null)
  }

  return (
    <>
      <Listbox
        value={config.lastUsedAccountId}
        onChange={(selectedAccountId: string) => {
          if (selectedAccountId === "__add__") {
            setLogInOpen(true)
            return
          }
          configDispatch({
            type: CONFIG_ACTIONS.SET_LAST_USED_ACCOUNT_ID,
            payload: selectedAccountId
          })
        }}
      >
        {({ open }) => (
          <div className="relative w-full">
            <div className="relative w-full h-8 flex rounded-sm overflow-hidden bg-zinc-800 shadow-sm shadow-zinc-950/50">
              <ListboxButton className="flex-1 h-full p-1 pr-2 flex items-center justify-start gap-2 text-sm cursor-pointer">
                <PiUserDuotone className={clsx("duration-200", open && "rotate-180")} />
                <p className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">{selectedAccount ? selectedAccount.playerName : t("features.config.selectAccount")}</p>
              </ListboxButton>
            </div>

            <AnimatePresence>
              {open && (
                <ListboxOptions static className="absolute top-full left-0 w-full mt-1 z-600 select-none rounded-sm overflow-hidden">
                  <motion.ul
                    variants={DROPUP_MENU_WRAPPER_VARIANTS}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="max-h-64 flex flex-col bg-zinc-950/80 backdrop-blur-md border border-zinc-400/5 shadow-sm shadow-zinc-950/50 hover:shadow-none rounded-sm overflow-y-scroll text-sm"
                  >
                    {config.accounts.length === 0 && <div className="w-full p-2 text-zinc-400 text-center text-xs">{t("features.config.noAccountsSaved")}</div>}

                    {config.accounts.map((account) => (
                      <ListboxOption
                        key={account.id}
                        value={account.id}
                        as={motion.li}
                        variants={DROPUP_MENU_ITEM_VARIANTS}
                        className="w-full h-10 p-1 flex items-center justify-between gap-2 overflow-hidden odd:bg-zinc-800/30 even:bg-zinc-950/30 cursor-pointer text-start border border-transparent"
                      >
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-start overflow-hidden whitespace-nowrap text-ellipsis">{account.playerName}</p>
                          <p className="text-zinc-400 text-xs overflow-hidden whitespace-nowrap text-ellipsis">{account.email}</p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRemoveAccountId(account.id)
                          }}
                          title={t("features.config.removeAccountTitle")}
                          className="shrink-0 p-1 hover:text-red-400 transition-colors"
                        >
                          <PiXCircleDuotone />
                        </button>
                      </ListboxOption>
                    ))}

                    <ListboxOption
                      value="__add__"
                      as={motion.li}
                      variants={DROPUP_MENU_ITEM_VARIANTS}
                      className="w-full h-10 p-1 flex items-center gap-2 overflow-hidden bg-zinc-900/50 cursor-pointer text-start border border-transparent hover:bg-zinc-700/30"
                    >
                      <PiPlusCircleDuotone />
                      <span>{t("features.config.addAccount")}</span>
                    </ListboxOption>
                  </motion.ul>
                </ListboxOptions>
              )}
            </AnimatePresence>
          </div>
        )}
      </Listbox>

      <PopupDialogPanel title={t("features.config.loginTitle")} isOpen={logInOpen} close={() => setLogInOpen(false)}>
        <FromWrapper className="w-full">
          <FormGroupWrapper bgDark={false}>
            <FromGroup>
              <FormHead>
                <FormLabel content={t("generic.email")} />
              </FormHead>

              <FormBody>
                <FormFieldGroup>
                  <FormInputText
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                    }}
                    placeholder={t("generic.email")}
                    readOnly={loggingIn}
                  />
                </FormFieldGroup>
              </FormBody>
            </FromGroup>

            <FromGroup>
              <FormHead>
                <FormLabel content={t("generic.password")} />
              </FormHead>

              <FormBody>
                <FormFieldGroup>
                  <FormInputPassword
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                    }}
                    placeholder={t("generic.password")}
                    readOnly={loggingIn}
                  />
                </FormFieldGroup>
              </FormBody>
            </FromGroup>

            <FromGroup>
              <FormHead>
                <FormLabel content={t("generic.twofacode")} />
              </FormHead>

              <FormBody>
                <FormFieldGroupWithDescription>
                  <FormInputText
                    value={twofacode}
                    onChange={(e) => {
                      setTwofacode(e.target.value)
                    }}
                    placeholder={t("generic.twofacode")}
                    minLength={6}
                    maxLength={6}
                    readOnly={loggingIn}
                  />
                  <FormFieldDescription content={t("features.config.onlyIfEnabledTwoFA")} />
                </FormFieldGroupWithDescription>
              </FormBody>
            </FromGroup>
          </FormGroupWrapper>

          <ButtonsWrapper className="text-lg" bgDark={false}>
            <FormButton onClick={() => setLogInOpen(false)} title={t("generic.goBack")} type="error" className="p-2">
              <PiXCircleDuotone />
            </FormButton>
            <FormButton onClick={handleLogin} title={t("generic.add")} type="success" className="p-2">
              <PiFloppyDiskBackDuotone />
            </FormButton>
          </ButtonsWrapper>
        </FromWrapper>
      </PopupDialogPanel>

      <PopupDialogPanel title={t("features.config.removeAccountTitle")} isOpen={!!removeAccountId} close={() => setRemoveAccountId(null)}>
        <>
          <p>{t("features.config.areYouSureRemoveAccount")}</p>
          <div className="flex gap-4 items-center justify-center text-lg">
            <FormButton title={t("generic.cancel")} className="p-2" onClick={() => setRemoveAccountId(null)} type="success">
              <PiXCircleDuotone />
            </FormButton>
            <FormButton
              title={t("features.config.removeAccountTitle")}
              className="p-2"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveAccount()
              }}
              type="error"
            >
              <PiTrashDuotone />
            </FormButton>
          </div>
        </>
      </PopupDialogPanel>
    </>
  )
}

export default AccountSelector
