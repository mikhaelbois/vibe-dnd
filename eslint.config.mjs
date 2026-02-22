import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  nextjs: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  stylistic: {
    quotes: 'single',
    semi: false,
  },
  ignores: [
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.history/**',
    'docs/**',
  ],
}, {
  rules: {
    // Next.js uses process.env as a standard pattern on both server and client
    'node/prefer-global/process': 'off',
    // Too strict for idiomatic React/Next.js patterns (e.g. `if (!character)`)
    'ts/strict-boolean-expressions': 'off',
  },
})
