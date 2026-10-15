import baseConfig from '@jlpt/config/eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['load/**/*.js', 'load/**/*.ts'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
      },
    },
  },
];
