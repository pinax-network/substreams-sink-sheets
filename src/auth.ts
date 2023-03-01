import { google } from 'googleapis'

export interface Credentials {
    accessToken: string;
    refreshToken: string;
}

export async function authenticate(credentials: Credentials) {
    if ( !isAuthenticated() ) {
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({
            access_token: credentials.accessToken as string,
            refresh_token: credentials.refreshToken as string,
        })
        google.options({auth: oauth2Client}) // Store the OAuth client object directly for use by future requests
    }

    return google.sheets({ version: 'v4' })
}

export function isAuthenticated() {
    return google._options['auth'] !== undefined
}

export async function issue(api_key: string, url: string) {
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
