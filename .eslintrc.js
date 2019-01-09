module.exports = {
    env: {
        es6: true,
        node: true
    },
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: 2017,
        sourceType: "script",
        ecmaFeatures: {
            impliedStrict: true
        }
    },
    rules: {
        "no-multiple-empty-lines": ["warn", { max: 2, maxEOF: 0 }],
        "no-trailing-spaces": [
            "warn",
            { skipBlankLines: false, ignoreComments: true }
        ],
        indent: ["warn", 4, { SwitchCase: 1 }],
        "operator-linebreak": [
            "warn",
            "before",
            {
                overrides: {
                    "?": "after",
                    ":": "before"
                }
            }
        ],
        semi: ["warn", "always"],
        "no-unused-expressions": "warn",
        "no-unused-vars": "warn",
        "no-console": "warn",
        "no-empty": "warn",
        "valid-typeof": "warn",
        "max-len": [
            "warn",
            {
                code: 120,
                comments: 90,
                ignoreTrailingComments: true,
                ignorePattern: "^//\\s*"
            }
        ],
        "space-in-parens": ["warn", "always", { exceptions: ["{}", "[]"] }]
    }
};
