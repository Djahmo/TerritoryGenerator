import nodemailer from 'nodemailer'
import env from '../../env.js'
import {htmlToText} from 'html-to-text'
import getMail from '../../utils/getMail.js'

interface SendMailOptions {
  type: string
  lang: string
  from?: string
  to: string
  data?: Record<string, string>
  replyTo?: string
  token?: string
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const LABELS : Record<string, string> = {
  "no-reply@djahmo.fr" : "Notifications"
}

export const sendMailNoReply = async ({ type, lang, to, data }: SendMailOptions) => {
  return sendMail({ type, lang, from: 'no-reply@djahmo.fr', token: env.MAIL_NOREPLY_TOKEN, to, data })
}

const sendMail = async ({ type, lang, from, token, to, data, replyTo }: SendMailOptions) => {
  if (!from || !token) {
    throw new Error('Missing from or token')
  }

  const transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: false,
    auth: {
      user: from,
      pass: token,
    },
  } as nodemailer.TransportOptions)

  let mail
  try {
    mail = await getMail(type, lang)
  } catch {
    mail = await getMail(type, 'gb')
  }
  if (!mail) {
    throw new Error('Mail not found')
  }
  let html = mail.html

  if (data) {
    Object.keys(data).forEach((key) => {
      const safeKey = escapeRegExp(key)
      html = html.replace(new RegExp(`{{${safeKey}}}`, 'g'), data[key])
    })
  }

  await transporter.sendMail({
    from: `Djahmo ${LABELS[from] + ' ' || ''}<${from}>`,
    to,
    subject: mail.subject,
    text: htmlToText(html),
    html,
    replyTo,
  })
}

