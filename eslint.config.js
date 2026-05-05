import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
console.log(firebaseRulesPlugin.configs['flat/recommended']);
export default [
  {
    ignores: ['dist/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
