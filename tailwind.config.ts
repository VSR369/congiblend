
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-background': 'var(--gradient-background)'
			},
			boxShadow: {
				'glow': 'var(--shadow-glow)',
				'custom-sm': 'var(--shadow-sm)',
				'custom-md': 'var(--shadow-md)',
				'custom-lg': 'var(--shadow-lg)'
			},
			transitionDuration: {
				'fast': 'var(--transition-fast)',
				'normal': 'var(--transition-normal)',
				'slow': 'var(--transition-slow)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'pulse-glow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-up': 'slide-up 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'shimmer': 'shimmer 2s infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
			},
				typography: {
					DEFAULT: {
						css: {
							'--tw-prose-body': 'hsl(var(--foreground))',
							'--tw-prose-headings': 'hsl(var(--foreground))',
							'--tw-prose-links': 'hsl(var(--primary))',
							'--tw-prose-bold': 'hsl(var(--foreground))',
							'--tw-prose-quotes': 'hsl(var(--foreground))',
							'--tw-prose-hr': 'hsl(var(--border))',
							'--tw-prose-th-borders': 'hsl(var(--border))',
							'--tw-prose-td-borders': 'hsl(var(--border))',
							'h1, h2, h3': {   // Fixed: quoted grouped selector
								scrollMarginTop: '6rem'
							},
							h1: { fontWeight: '700' },
							h2: { marginTop: '1.6em', marginBottom: '0.6em', fontWeight: '600' },
							h3: { marginTop: '1.2em', marginBottom: '0.4em', fontWeight: '600' },
							p: { marginTop: '0.8em', marginBottom: '0.8em' },
							ul: { marginTop: '0.8em', marginBottom: '0.8em', paddingLeft: '1.25em' },
							ol: { marginTop: '0.8em', marginBottom: '0.8em', paddingLeft: '1.25em' },
							li: { marginTop: '0.25em', marginBottom: '0.25em' },
							blockquote: { fontStyle: 'normal', borderLeftColor: 'hsl(var(--primary))' },
							code: { backgroundColor: 'hsl(var(--muted))', padding: '0.15em 0.35em', borderRadius: '0.25rem' }
						}
					},
					sparks: {
						css: {
							maxWidth: 'none',
							h1: { marginTop: '1.2em', marginBottom: '0.4em', fontWeight: '700' },
							h2: { marginTop: '1em', marginBottom: '0.35em', fontWeight: '600' },
							h3: { marginTop: '0.8em', marginBottom: '0.3em', fontWeight: '600' },
							p: { marginTop: '0.45em', marginBottom: '0.45em' },
							'ul, ol': { marginTop: '0.5em', marginBottom: '0.5em', paddingLeft: '1rem' },
							li: { marginTop: '0.15em', marginBottom: '0.15em' },
							blockquote: { fontStyle: 'normal', borderLeftColor: 'hsl(var(--primary))', marginTop: '0.8em', marginBottom: '0.8em' },
							code: { backgroundColor: 'hsl(var(--muted))', padding: '0.15em 0.35em', borderRadius: '0.25rem' },
							'img, video': { marginTop: '0.75em', marginBottom: '0.75em' },
							table: { marginTop: '0.75em', marginBottom: '0.75em' },
							hr: { marginTop: '1em', marginBottom: '1em', borderColor: 'hsl(var(--border))' },
							'h2 + p, h3 + p': { marginTop: '0.3em' },
							'& :where(p:first-child)': { marginTop: '0' },
							'& :where(p:last-child)': { marginBottom: '0' },
							'& :where(h2:first-child, h3:first-child)': { marginTop: '0' },
							'& :where(h2 + h3)': { marginTop: '0.5em' },
							'& p:has(> br:only-child)': { display: 'none' }
						}
					}
				}
		}
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

