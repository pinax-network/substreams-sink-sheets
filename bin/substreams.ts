import { Substreams, download } from 'substreams'
import { handleOperation } from './handler'
import { google } from 'googleapis'
import * as dotenv from 'dotenv'

dotenv.config()

// Google Sheets API
const auth = new google.auth.JWT({
    email: process.env.SERVICE_ACCOUNT_EMAIL,
    key: process.env.SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
})
const sheets = google.sheets({version: 'v4', auth})

export async function appendToSheet(sheetId: string, rows: any[]) {
    const values = []
    for ( let row of rows ) {
        // Filter out null values from the row, taken from https://stackoverflow.com/a/38340730
        row = Object.fromEntries(Object.entries(row).filter(([, v]) => v != null))
        values.push(Object.keys(row).map(key => row[key] != null && row[key]))
    }

    const request = {
        spreadsheetId: sheetId,

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

export async function run(spkg: string, sheetId: string, args: {
    outputModule?: string,
    startBlock?: string,
    stopBlock?: string,
    substreamsEndpoint?: string,
} = {}) {
    // User params
    const messageTypeName = 'sf.substreams.sink.database.v1.DatabaseChanges'
    if ( !args.outputModule ) throw new Error('[outputModule] is required')

    // Initialize Substreams
    const substreams = new Substreams(args.outputModule, {
        host: args.substreamsEndpoint,
        startBlockNum: args.startBlock,
        stopBlockNum: args.stopBlock,
        authorization: process.env.STREAMINGFAST_KEY // or SUBSTREAMS_API_TOKEN
    })

    // Download Substream from URL or IPFS
    const { modules, registry } = await download(spkg)

    // Find Protobuf message types from registry
    const DatabaseChanges = registry.findMessage(messageTypeName)
    if (!DatabaseChanges) throw new Error(`Could not find [${messageTypeName}] message type`)

    substreams.on('mapOutput', (output, clock) => {
        // Handle map operations
        if (!output.data.mapOutput.typeUrl.match(messageTypeName)) return
        const decoded = DatabaseChanges.fromBinary(output.data.mapOutput.value)
        
        const rows: any[] = []
        for ( const operation of decoded.tableChanges ) {
            rows.push(handleOperation(operation.toJson(), clock))
        }

        appendToSheet(sheetId, rows) // TODO: Check for error and notify/retry on error
    })

    // start streaming Substream
    await substreams.start(modules)
}
