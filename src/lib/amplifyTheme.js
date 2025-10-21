import { createTheme } from '@aws-amplify/ui'

const brandGradient = 'linear-gradient(135deg, rgba(233, 30, 99, 0.95), rgba(163, 69, 255, 0.9))'

export const dreamlogTheme = createTheme({
  name: 'dreamlog-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: 'rgba(233, 30, 99, 0.95)',
          80: 'rgba(163, 69, 255, 0.9)',
        },
      },
      background: {
        primary: 'transparent',
        secondary: 'rgba(9, 11, 23, 0.35)',
        tertiary: 'rgba(9, 11, 23, 0.35)',
      },
      border: {
        primary: 'rgba(255, 255, 255, 0.18)',
      },
      font: {
        primary: 'rgba(245, 246, 255, 0.92)',
        secondary: 'rgba(255, 255, 255, 0.65)',
      },
      shadow: {
        primary: 'rgba(8, 12, 28, 0.3)',
      },
    },
    radii: {
      small: '12px',
      medium: '16px',
      large: '24px',
      xl: '28px',
    },
    shadows: {
      small: { value: '0 16px 32px rgba(163, 69, 255, 0.35)' },
      medium: { value: '0 24px 60px rgba(8, 12, 28, 0.3)' },
    },
    fontSizes: {
      xl: { value: '1.6rem' },
    },
  },
  components: {
    card: {
      style: {
        backgroundColor: 'rgba(7, 9, 20, 0.25)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 24px 60px rgba(8, 12, 28, 0.3)',
        borderRadius: '{radii.xl}',
      },
    },
    fieldcontrol: {
      style: {
        backgroundColor: 'rgba(9, 11, 23, 0.45)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '{radii.medium}',
        color: '{colors.font.primary}',
      },
      states: {
        focus: {
          borderColor: 'rgba(233, 30, 99, 0.55)',
          boxShadow: '0 0 0 3px rgba(163, 69, 255, 0.25)',
        },
      },
    },
    heading: {
      style: {
        color: '{colors.font.primary}',
        fontSize: '{fontSizes.xl}',
      },
    },
    text: {
      style: {
        color: '{colors.font.secondary}',
      },
    },
    button: {
      primary: {
        backgroundColor: 'transparent',
        backgroundImage: brandGradient,
        border: 'none',
        color: '#fff',
        boxShadow: '0 12px 25px rgba(163, 69, 255, 0.35)',
        borderRadius: '999px',
        paddingInline: '1.75rem',
      },
      link: {
        color: '#f472b6',
        fontWeight: 600,
      },
    },
    alert: {
      style: {
        backgroundColor: 'rgba(233, 30, 99, 0.12)',
        borderRadius: '{radii.medium}',
        border: '1px solid rgba(233, 30, 99, 0.35)',
        color: '{colors.font.primary}',
      },
    },
  },
})
