import { google } from 'googleapis'

export interface Credentials {
    client_email: string;
    private_key: string;
}

export function authenticate(credentials: Credentials) {
    const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    return google.sheets({version: 'v4', auth})
}

export function parseCredentials(json_str: string): Credentials {
    try {
        const {client_email, private_key } = JSON.parse(json_str)
        if ( !client_email || !private_key ) throw new Error('read credentials missing [client_email] or [private_key]');
        return {client_email, private_key};
    } catch (e) {
        throw new Error('read credentials invalid JSON');
    }
}