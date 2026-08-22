import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'

/**
 * ESLint runs for exactly one purpose here: enforcing the layer graph from
 * §3.3. Biome owns lint and format for everything else.
 *
 *   app → pages → widgets → features → entities → shared
 *
 * Imports only ever point right. Two slices in the same layer cannot see each
 * other either — they compose one layer up (§4 "Cross-slice qoidasi"), which
 * is why widgets/features/entities have no same-type policy below. `shared` is
 * the documented exception (§3.3): its slices may use one another.
 */
export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'src/shared/api/generated/**',
      'src/routeTree.gen.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },

    plugins: { boundaries },

    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'pages', pattern: 'src/pages' },
        { type: 'widgets', pattern: 'src/widgets/*' },
        { type: 'features', pattern: 'src/features/*' },
        { type: 'entities', pattern: 'src/entities/*' },
        { type: 'shared', pattern: 'src/shared/*' },
      ],
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },

    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'pages' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['pages', 'widgets', 'features', 'entities', 'shared'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'widgets' } },
              allow: {
                to: { element: { types: { anyOf: ['features', 'entities', 'shared'] } } },
              },
            },
            {
              from: { element: { type: 'features' } },
              allow: { to: { element: { types: { anyOf: ['entities', 'shared'] } } } },
            },
            {
              from: { element: { type: 'entities' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
          ],
        },
      ],
    },
  },
]
