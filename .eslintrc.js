// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    browser: true,
    es2021: true,
    jest: true,
    node: true,
  },
  ignorePatterns: [
    '/dist/*',
    'admin-web/dist/**',
    'build/**',
    '.expo/**',
    '.firebase/**',
    'android/**',
    'ios/**',
    'node_modules/**',
    'components/admin/**',
    'components/SafeAreaWrapper.jsx',
    'components/SimpleLoader.jsx',
    'components/LoadingScreen.jsx',
    'components/call/VideoCallScreen.jsx',
    'components/common/FirebaseTest.tsx',
    'hooks/useCallNavigation.js',
    'hooks/useCallPermissions.js',
    'hooks/useOnlineStatus.js',
    'firebase/init.js',
  ],
  rules: {
    'import/named': 'off',
    'import/namespace': 'off',
  },
};
