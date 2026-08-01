import eslintPluginAstro from 'eslint-plugin-astro'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist/**', '.vercel/**', 'node_modules/**', '.astro/**'],
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [...tseslint.configs.recommended],
  },
  ...eslintPluginAstro.configs['flat/recommended'],
  eslintConfigPrettier,
)
