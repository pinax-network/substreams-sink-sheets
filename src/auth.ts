import { createServer, IncomingMessage, ServerResponse } from 'http'
import { google } from 'googleapis'
import open from 'open'
import * as url from 'url'

export interface Credentials {
    client_id: string;
    client_secret: string;
}

async function oauth_request(oauth2Client: any) {
    return new Promise((resolve, reject) => {
        // grab the url that will be used for authorization
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/spreadsheets',
        })

        const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            try {
                if (req.url && req.url.indexOf('/oauth2callback') > -1) {
                    const qs = new url.URL(req.url, 'http://localhost:3000').searchParams
                    res.end('Authentication successful !')
                    server.close()
                    const { tokens } = await oauth2Client.getToken(qs.get('code') || '')
                    oauth2Client.credentials = tokens
                    resolve(oauth2Client)
                }
            } catch (e) {
                reject(e)
            }
        }).listen(3000, () => {
            // open the browser to the authorize url to start the workflow
            open(authorizeUrl, {wait: false}).then((cp: any) => cp.unref())
        })
    })
}

export async function authenticate(credentials: Credentials) {
    if ( !google._options['auth'] ) {
        const oauth2Client = new google.auth.OAuth2(
            credentials.client_id,
            credentials.client_secret,
            'http://localhost:3000/oauth2callback' // Callback URL for Google OAuth
        )

        google.options({auth: oauth2Client}) // Store the OAuth client object directly for use by future requests
        await oauth_request(oauth2Client) // TODO: Handle error
    }

    return google.sheets({ version: 'v4' })
}

export function parseCredentials(json_str: string): Credentials {
    try {
        const { client_id, client_secret } = JSON.parse(json_str).web
        if ( !client_id || !client_secret ) throw new Error('read credentials missing [client_email] or [private_key]')

        return { client_id, client_secret }
    } catch (e) {
        throw new Error('read credentials invalid JSON')
    }
}