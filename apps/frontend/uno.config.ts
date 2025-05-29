import { defineConfig, presetWind4, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [presetWind4({ dark: 'class' })],
  transformers: [transformerVariantGroup()],
  preflights: [
    {
      getCSS: () => `:root { --font-sans: InterVariable, sans-serif; }`,
    },
  ],
  theme: {
    colors: {
      light: '#FFFFFB',       // fond principal light
      dark: '#2B252A',        // fond principal dark
      lightnd: '#FFF9F1',     // fond secondaire light
      darknd: '#242024',      // fond secondaire dark

      muted: '#a6a37c',       // texte secondaire / désactivé
      foreground: "#95908d",

      accent: {
        DEFAULT: '#A65C82',       // prune rosé profond
        hover: '#944D72',         // un peu plus sombre
        unactive: '#7B3D5E',        // marqué mais doux
        disabled: '#E5A2C6',      // clair, utilisable en fond ou tag off
      },

      success: {
        DEFAULT: '#4BE69F',
        hover: '#3DDC8D',
        unactive: '#2BBF7A',
        disabled: '#A2F0D7',
      },

      warning: '#F9BC37',
      error: '#F85760',

      positive: {
        DEFAULT: '#FFA743',       // ambre cuivré
        hover: '#D9903B',         // un peu plus foncé
        unactive: '#C17F2F',        // profond mais pas terne
        disabled: '#F2D3A7',      // pâle, doux et lisible
      },

      neutral: {
        DEFAULT: '#64748B',
        hover: '#475569',
        unactive: '#334155',
        disabled: '#CBD5E1',
      },

      negative: {
        DEFAULT: '#F85760',
        hover: '#DC3545',
        active: '#B91C1C',
        disabled: '#FECACA',
      },
    },
  },
  shortcuts: [
    ['btn', 'inline-flex items-center justify-center px-4 py-2 rounded-sm transition-colors text-sm font-medium cursor-pointer transition duration-200 ease-in-out'],
    ['btn-sm', 'inline-flex items-center justify-center p-2 w-fit aspect-square rounded-sm transition-colors cursor-pointer transition duration-200 ease-in-out'],
    ['ctrlbtn', 'btn flex-1 rounded-none enabled:(hover:bg-muted/10 active:bg-muted/20) disabled:(text-muted/40 cursor-default)'],
    ['btn-positive', 'btn bg-positive text-white hover:bg-positive-hover active:bg-positive disabled:bg-positive-disabled'],
    ['btn-accent', 'btn bg-accent text-white hover:bg-accent-hover active:bg-accent disabled:bg-accent-disabled'],
    ['btn-success', 'btn bg-success text-black hover:bg-success-hover active:bg-success disabled:bg-success-disabled'],
    ['btn-neutral', 'btn bg-neutral text-white hover:bg-neutral-hover active:bg-neutral disabled:bg-neutral-disabled'],
    ['btn-negative', 'btn bg-negative text-white hover:bg-negative-hover active:bg-negative-active disabled:bg-negative-disabled'],
    ['btn-unselected', 'btn-sm border border-muted/50 bg-transparent text-positive hover:bg-muted/10'],
    ['btn-selected', 'btn-sm border border-positive/50 bg-positive/20 text-positive hover:bg-muted/10'],
  ],
})
