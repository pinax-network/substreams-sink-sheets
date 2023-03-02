import fs from 'fs'
import { google } from 'googleapis'

export interface Credentials {
    access_token: string;
    refresh_token: string;
}

export interface ServiceCredentials {
    client_email: string;
    private_key: string;
    type: string;
}

export async function authenticateOAuth2(credentials: Credentials) {
    const auth = new google.auth.OAuth2()
    auth.setCredentials(credentials);
    return google.sheets({ version: 'v4', auth})
}

export async function handle_google_authentication(args: {
    accessToken?: string,
    refreshToken?: string,
    credentials?: string,
}) {
    if ( args.accessToken && args.refreshToken ) {
        return await authenticateOAuth2({ access_token: args.accessToken, refresh_token: args.refreshToken })
    } else if ( args.credentials ) {
        return await authenticateServiceAccount(args.credentials)
    } else {
        throw new Error('Google OAuth2 tokens or credentials file is required')
    }
}

export async function authenticateServiceAccount(json_file_url: string) {
    const credentials = await parseServiceCredentials(json_file_url)
    if ( !credentials.client_email ) throw new Error('Invalid credentials file (missing client_email)')
    if ( !credentials.private_key ) throw new Error('Invalid credentials file (missing private_key)')

    const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
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

export async function parseServiceCredentials(json_file_url: string): Promise<ServiceCredentials> {
    // handle as URL
    if ( json_file_url.match(/https?:\/\//) ) {
        const response = await fetch(json_file_url)
        return await response.json()
    // handle as file
    } else {
        if ( fs.existsSync(json_file_url) === false ) throw new Error(`Credentials file not found: ${json_file_url}`)

        try {
            return JSON.parse(fs.readFileSync(json_file_url, {encoding: 'utf-8'}))
        } catch (e) {
            throw new Error(`Error parsing credentials file: ${json_file_url}`)
        }
    }
}