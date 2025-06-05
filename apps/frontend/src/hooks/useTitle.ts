import { useEffect } from 'react'

/**
 * Met à jour le titre de la page.
 * @param title Titre à afficher
 * @param options Options de configuration
 * @param options.suffix Si true, ajoute " – Djahmo" à la fin. Par défaut true.
 */
export const useTitle = (title: string, options?: { suffix?: boolean}) => {
  useEffect(() => {
    const fullTitle = options?.suffix === false ? title : `${title} – Djahmo`
    document.title = fullTitle
  }, [title, options?.suffix])
}
