// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            'no-console': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'no-var': 'error',
            'prefer-const': ['error', { destructuring: 'all' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
);
