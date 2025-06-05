import axios from "axios"
import { toast } from "sonner"
import { t } from "i18next"
import i18n from "µ/i18n"
import { supportedLanguages } from 'µ/i18n'

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

export const baseURL = '/api'

export const sendApi = (url: string, method = 'GET', options: any = {}, credentials?: boolean): Promise<string | Blob | object | null> => send(baseURL + url, method, options, credentials)

export const sendApiC = (url: string, method = 'GET', options: any = {}): Promise<string | Blob | object | null> => send(baseURL + url, method, options, true)

export const send = async (url: string, method = 'GET', options: any = {}, credentials = false): Promise<string | Blob | object | null> => {
  const rawLang = i18n.language.slice(0, 2)
  const lang = supportedLanguages.includes(rawLang) ? rawLang : 'gb'
  if (!options.headers) options.headers = {}
  options.headers['Accept-Language'] = lang
  if (credentials) options.credentials = 'include'
  const response = await axios.request({ url, method, withCredentials: credentials, ...options })
  return response.data
}

export const getError = (err: any): string => {
  const raw = err?.response?.data?.errors?.[0]?.message || err?.response?.data?.message || err?.message || err || 'common.error'
  if (typeof raw === 'string')
    return raw
  else {
    console.error('Error is not a string', raw)
    return 'common.error'
  }
}

export const error = (err: any): void => {
  const error = t(getError(err))
  console.error(error)
  toast.error(error)
}

export const success = (text: string): void => {
  const success = t(text)
  toast.success(success)
}

export let isOnline = false;

export const checkOnlineStatus = async () => {
  try {
    await send('https://reqres.in/', 'HEAD', { cache: 'no-store' })
    isOnline = true
  } catch {
    isOnline = false
  }
}

setInterval(async () => {
  try {
    await send('https://reqres.in/', 'HEAD', { cache: 'no-store' });
    if (!isOnline)
      toast.success(t('common.status.online'))
    isOnline = true;
  } catch (e) {
    if (isOnline)
      toast.warning(t('common.status.offline'))
    isOnline = false;
  }
}, 10000);
