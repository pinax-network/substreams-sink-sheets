import * as fs from 'fs'
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

export function to_credentials(str: string): Credentials {
    try {
        const {client_email, private_key } = JSON.parse(str)
        if ( !client_email || !private_key ) throw new Error('read credentials missing [client_email] or [private_key]');
        return {client_email, private_key};
    } catch (e) {
        throw new Error('read credentials invalid JSON');
    }
}

export function read_credentials_from_file(filepath: string, foo: any): string {
    if ( !filepath ) throw new Error(`[${filepath}] read credentials file not found`);
    try {
        return fs.readFileSync(filepath, 'utf-8');
    } catch (e) {
        throw new Error('read credentials invalid JSON');
    }
}