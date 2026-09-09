import { expect, it } from 'vitest'
import bcrypt from 'bcrypt'
import { createCanvas, loadImage } from 'canvas'
import sharp from 'sharp'
import nodemailer from 'nodemailer'
import { htmlToText } from 'html-to-text'
import { nanoid } from 'nanoid'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

it('loads native password hashing and verifies a saved password', async () => {
  const hash = await bcrypt.hash('Dependency-test-Password9!', 4)
  expect(await bcrypt.compare('Dependency-test-Password9!', hash)).toBe(true)
  expect(await bcrypt.compare('different', hash)).toBe(false)
})

it('renders a PNG and converts a thumbnail with the real canvas and sharp binaries', async () => {
  const canvas = createCanvas(80, 60)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#123456'; ctx.fillRect(0, 0, 80, 60)
  const png = canvas.toBuffer('image/png')
  const image = await loadImage(png)
  expect([image.width, image.height]).toEqual([80, 60])
  const thumbnail = await sharp(png).resize(40, 30).webp().toBuffer()
  expect(await sharp(thumbnail).metadata()).toMatchObject({ format: 'webp', width: 40, height: 30 })
})

it('composes an email with the new Nodemailer API without sending it', async () => {
  const transport = nodemailer.createTransport({ jsonTransport: true })
  const html = '<p>Territoire &amp; annotations</p>'
  const result = await transport.sendMail({ from: 'from@example.test', to: 'to@example.test', subject: 'Test', html, text: htmlToText(html) })
  expect(JSON.parse(result.message.toString())).toMatchObject({ subject: 'Test', text: 'Territoire & annotations', html })
  expect(nanoid()).toMatch(/^[A-Za-z0-9_-]{21}$/)
})

it('registers the multipart plugin against the updated Fastify version', async () => {
  const app = Fastify()
  try { await app.register(multipart); await app.ready(); expect(app.hasRequestDecorator('file')).toBe(true) }
  finally { await app.close() }
})
