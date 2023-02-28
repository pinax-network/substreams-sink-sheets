{
    "name": "substreams-sink-sheets",
    "version": "0.1.2",
    "description": "Substreams Google Sheets sink module",
    "main": "dist/index.js",
    "types": "dist/index.d.js",
    "bin": {
        "substreams-sink-sheets": "dist/bin/cli.js"
    },
    "repository": "git@github.com:pinax-network/substreams-sink-sheets.git",
    "keywords": [
        "substreams",
        "streamingfast",
        "firehose",
        "thegraph",
        "pinax"
    ],
    "author": {
        "name": "Krow10",
        "email": "23462475+Krow10@users.noreply.github.com"
    },
    "files": [
        "dist"
    ],
    "contributors": [
        {
            "name": "Denis",
            "email": "denis@pinax.network"
        }
    ],
    "license": "MIT OR Apache-2.0",
    "scripts": {
        "prepublishOnly": "tsc",
        "build": "tsc && pkg . --out-path out/",
        "dev": "next dev"
    },
    "dependencies": {
        "commander": "10.x",
        "fs": "^0.0.1-security",
        "googleapis": "111.x",
        "next-auth": "^4.19.2",
        "open": "^8.4.2",
        "substreams": "0.3.x",
        "winston": "3.x"
    },
    "devDependencies": {
        "@types/react": "18.0.28",
        "@typescript-eslint/eslint-plugin": "^5.53.0",
        "@typescript-eslint/parser": "^5.53.0",
        "eslint": "^8.34.0",
        "eslint-config-standard-with-typescript": "^34.0.0",
        "eslint-plugin-import": "^2.27.5",
        "eslint-plugin-n": "^15.6.1",
        "eslint-plugin-promise": "^6.1.1",
        "pkg": "5.x",
        "typescript": "*"
    }
}
