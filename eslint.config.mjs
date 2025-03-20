import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fixupConfigRules } from '@eslint/compat'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  {
    ignores: ['**/dist/', '**/validate-package-version.js'],
  },
  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'prettier',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
      'plugin:import/errors',
      'plugin:import/warnings',
      'plugin:import/typescript'
    )
  ),
  {
    languageOptions: {
      globals: {
        ...globals.commonjs,
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
    },

    rules: {
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',

      '@typescript-eslint/array-type': [
        'warn',
        {
          default: 'generic',
        },
      ],

      'import/order': [
        'warn',
        {
          'newlines-between': 'always',

          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      'import/no-unresolved': 'off',

      'import/newline-after-import': [
        'warn',
        {
          count: 1,
        },
      ],

      'import/no-mutable-exports': 'error',
    },
  },
]
