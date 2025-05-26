import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '#/ui/shadcn/Select'
import { supportedLanguages, languageLabels } from 'µ/i18n'

const LanguageSelector = () => {
  const { i18n } = useTranslation()
  const rawLang = i18n.language.slice(0, 2)
  const lang = supportedLanguages.includes(rawLang) ? rawLang : 'gb'

  return (
    <Select value={lang} onValueChange={i18n.changeLanguage}>
      <SelectTrigger className="w-20 justify-center">
        <img
          src={`/images/flags/${lang}.svg`}
          alt={lang}
          className="w-5 h-5 object-contain"
        />
      </SelectTrigger>
      <SelectContent>
        {supportedLanguages.map((code) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center gap-2">
              <img
                src={`/images/flags/${code}.svg`}
                alt={code}
                className="w-5 h-5 object-contain"
              />
              <span>{languageLabels[code] ?? code}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSelector
