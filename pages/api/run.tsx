import { getToken } from 'next-auth/jwt'
import { google } from 'googleapis'
import { run } from '../../index.ts'

export default async function handler(req, res) {
    const token = await getToken({ req })
    if ( token ) {
        const body = req.body
        console.log('body: ', body)

        const validateData = ( body ) => {
            // TODO: Validate form data
            return true
        }

        if ( !validateData(body) ) {
            return res.status(400).json({ data: 'Invalid request' })
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
        )

        oauth2Client.setCredentials({
            access_token: token.accessToken,
            refresh_token: token.refreshToken
        })
        google.options({auth: oauth2Client}) // Store the OAuth client object directly for use by future requests

        await run(
            body.spkg,
            body.spreadsheetId,
            body.args
        )
        
        res.status(200).json({ data: 'Success !' })
    } else {
        res.status(401).json({ data: 'Not authenticated !' })
    }

    res.end()
}
