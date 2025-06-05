const template = /*html*/`
  <body style="font-family: Arial, sans-serif; background-color: #242024; color: #FFFFFB; padding: 40px 20px; margin: 0;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://territory.djahmo.fr/images/logo.positive.png" alt="Territory Generator" width="160" style="max-width: 100%;" />
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; margin: 0 auto; background-color: #2B252A; border: 1px solid #FFA743; border-radius: 5px; padding: 20px;">
      <tr>
        <td style="padding-bottom: 20px;">
          <h1 style="color: #FFF9F1; margin-top: 0;">{{title}}</h1>
          <div style="color: #FFFFFB; font-size: 14px; line-height: 1.6;">
            {{children}}
          </div>
        </td>
      </tr>
      <tr>
        <td style="border-top: 1px solid #FFA743; padding-top: 20px; text-align: center; font-size: 12px; color: #ccc;">
          Territory Generator &copy; {{year}} — {{allrights}}<br />
        </td>
      </tr>
    </table>
  </body>
`

export default template
