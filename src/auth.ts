import { google } from 'googleapis'

import { readFileSync } from './utils'

export interface Credentials {
    accessToken: string;
    refreshToken: string;
}

export async function authenticateOAuth2(credentials: Credentials) {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({
        access_token: credentials.accessToken as string,
        refresh_token: credentials.refreshToken as string,
    })

    return google.sheets({ version: 'v4', auth})
}

export async function authenticateServiceAccount(json_file_url: string) {
    let creds
    if ( json_file_url.match(/https?:\/\//) )
        creds = await (await fetch(json_file_url)).json() // Handle as URL
    else
        creds = JSON.parse(readFileSync(json_file_url)) // Handle as file

    if ( creds?.type != 'service_account' ) throw new Error()

    const auth = new google.auth.JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })

    return google.sheets({ version: 'v4', auth})
}

export function isAuthenticated() {
    return google._options['auth'] !== undefined
}

export async function issueSubstreamsAPIToken(api_key: string, url: string) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({api_key}),
    }

    const response = await fetch(url, options)
    return (await response.json())?.token
}