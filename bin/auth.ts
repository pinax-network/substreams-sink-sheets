import * as fs from 'fs'
import { google } from 'googleapis'

interface Credentials {
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

export function read_credentials(filepath: string) {
    if ( !filepath ) throw new Error('read credentials file not found');
    let creds: Credentials;
    try {
        creds = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    } catch (e) {
        throw new Error('read credentials invalid JSON');
    }
    if ( !creds.client_email || !creds.private_key ) throw new Error('read credentials missing [client_email] or [private_key]');
    return creds;
}