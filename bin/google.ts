import * as fs from 'fs'
import { google } from 'googleapis'

let sheets = google.sheets('v4')

// TODO: Check for error and notify/retry on error
export async function appendToSheet(spreadsheetId: string, rows: any[]) {
    const values = []
    for ( let row of rows ) {
        // Filter out null values from the row, taken from https://stackoverflow.com/a/38340730
        row = Object.fromEntries(Object.entries(row).filter(([, v]) => v != null))
        values.push(Object.keys(row).map(key => row[key] != null && row[key]))
    }

    const request = {
        spreadsheetId,

        // See https://developers.google.com/sheets/api/guides/concepts#cell
        range: 'Sheet1',

        // See https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption
        valueInputOption: 'RAW',

        // See https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append#insertdataoption
        insertDataOption: 'INSERT_ROWS',

        resource: {
            values
        },
    }

    try {
        const response = (await sheets.spreadsheets.values.append(request)).data
        console.log(`Google Sheets API response: ${JSON.stringify(response, null, 2)}`)
        console.log(`[+] Added ${response?.updates?.updatedRows} rows to "${response?.spreadsheetId}"`)
    } catch (err) {
        console.error(err)
    }
}

// TODO: Check for errors
export function authenticate(credentials: string) {
    const creds = JSON.parse(fs.readFileSync(credentials, 'utf-8'))
    const auth = new google.auth.JWT({
        email: creds?.client_email,
        key: creds?.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })

    sheets = google.sheets({version: 'v4', auth})
}