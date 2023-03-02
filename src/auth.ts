import { google } from 'googleapis'

export interface Credentials extends ServiceCredentials {
    access_token?: string;
    refresh_token?: string;
}

export interface ServiceCredentials {
    client_email?: string;
    private_key?: string;
}

export async function authenticateOAuth2(credentials: Credentials) {
    if ( !credentials.access_token ) throw new Error('Invalid credentials file (missing access_token)')
    if ( !credentials.refresh_token ) throw new Error('Invalid credentials file (missing refresh_token)')

    const auth = new google.auth.OAuth2()
    auth.setCredentials(credentials)
    return google.sheets({ version: 'v4', auth})
}

export async function authenticateGoogle(credentials: Credentials ) {
    // Service Credentials
    if ( credentials.private_key && credentials.client_email ) {
        return authenticateServiceAccount(credentials)
    // OAuth2 Credentials
    } else if ( credentials.access_token && credentials.refresh_token ) {
        return authenticateOAuth2(credentials);
    }
    throw new Error('Google OAuth2 tokens or credentials file is required')
}

export async function authenticateServiceAccount(credentials: ServiceCredentials) {
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
