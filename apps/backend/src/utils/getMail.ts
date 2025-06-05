import template from '../lib/mail/components/template.js';

const getMail = async (type: string, lang: string) => {
  const { default: data } = await import(`../lib/mail/translations/${lang}/${type}.js`)
  return {
    html: template
      .replace('{{title}}', data.title)
      .replace('{{children}}', data.children)
      .replace('{{year}}', new Date().getFullYear().toString())
      .replace('{{allrights}}', lang === 'fr' ? 'Tous droits réservés' : 'All rights reserved'),
    subject: 'Djahmo - ' + data.title,
  }
}

export default getMail
