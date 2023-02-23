import { google } from 'googleapis'

// Google Sheets API
const auth = new google.auth.JWT({
    email: process.env.SERVICE_ACCOUNT_EMAIL,
    key: process.env.SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
})
const sheets = google.sheets({version: 'v4', auth})

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
    } catch (err) {
        console.error(err)
    }
}