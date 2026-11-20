import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a', // 배경
        card: '#1e293b', // 카드
        line: '#334155', // 보더
        ink: '#e2e8f0', // 본문 텍스트
        muted: '#94a3b8', // 보조 텍스트
        accent: '#00e676', // 포인트(전환)
        sky: { DEFAULT: '#38bdf8' }, // 포인트(정보)
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      maxWidth: {
        content: '46rem',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#e2e8f0',
            '--tw-prose-headings': '#f8fafc',
            '--tw-prose-lead': '#cbd5e1',
            '--tw-prose-links': '#38bdf8',
            '--tw-prose-bold': '#f8fafc',
            '--tw-prose-counters': '#94a3b8',
            '--tw-prose-bullets': '#00e676',
            '--tw-prose-hr': '#334155',
            '--tw-prose-quotes': '#e2e8f0',
            '--tw-prose-quote-borders': '#00e676',
            '--tw-prose-captions': '#94a3b8',
            '--tw-prose-code': '#f8fafc',
            '--tw-prose-pre-code': '#e2e8f0',
            '--tw-prose-pre-bg': '#0b1220',
            '--tw-prose-th-borders': '#475569',
            '--tw-prose-td-borders': '#334155',
            lineHeight: '1.85',
            wordBreak: 'keep-all',
            overflowWrap: 'anywhere',
            a: { textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: '500' },
            'h2, h3': { scrollMarginTop: '5rem', letterSpacing: '-0.01em' },
            h2: { borderLeft: '4px solid #00e676', paddingLeft: '0.75rem' },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            table: { display: 'block', overflowX: 'auto', whiteSpace: 'nowrap' },
          },
        },
      },
    },
  },
  plugins: [typography],
};
