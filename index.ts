import { Substreams, download, unpack, Clock } from 'substreams'
import { parseDatabaseChanges, getDatabaseChanges } from './src/database_changes'
import { createSpreadsheet, formatRow, appendRows, insertHeaderRow } from './src/google'
import { authenticateGoogle, Credentials } from './src/auth'
import { logger } from './src/logger'

export * from './src/google'
export * from './src/database_changes'
export * from './src/auth'

import { timeout } from './src/utils'
import * as dotenv from 'dotenv'
dotenv.config()

const TIMEOUT = 1000 // rate limit on Google API is 100 requests per 100 seconds
export const MESSAGE_TYPE_NAMES = ['sf.substreams.sink.database.v1.DatabaseChanges', 'sf.substreams.database.v1.DatabaseChanges']
export const MESSAGE_TYPE_NAME = MESSAGE_TYPE_NAMES[0]
export const DEFAULT_API_TOKEN_ENV = 'SUBSTREAMS_API_TOKEN'
export const DEFAULT_OUTPUT_MODULE = 'db_out'
export const DEFAULT_SUBSTREAMS_ENDPOINT = 'https://mainnet.eth.streamingfast.io:443'
export const DEFAULT_COLUMNS = []
export const DEFAULT_ADD_HEADER_ROW = false
export const DEFAULT_RANGE = 'Sheet1'

export async function run(url: string, spreadsheetId: string, options: {
    // substreams options
    outputModule?: string,
    substreamsEndpoint?: string,
    startBlock?: string,
    stopBlock?: string,
    substreamsApiToken?: string,
    substreamsApiTokenEnvvar?: string
    delayBeforeStart?: number,

    // sheet sink options
    columns?: string[],
    addHeaderRow?: boolean,
    range?: string,
    credentials?: Credentials,
} = {}) {
    // User params
    const outputModule = options.outputModule ?? DEFAULT_OUTPUT_MODULE
    const substreamsEndpoint = options.substreamsEndpoint ?? DEFAULT_SUBSTREAMS_ENDPOINT
    const addHeaderRow = options.addHeaderRow ?? DEFAULT_ADD_HEADER_ROW
    const range = options.range ?? DEFAULT_RANGE
    const api_token_envvar = options.substreamsApiTokenEnvvar ?? DEFAULT_API_TOKEN_ENV
    const api_token = options.substreamsApiToken ?? process.env[api_token_envvar]
    let columns = options.columns ?? DEFAULT_COLUMNS

    if ( !range ) throw new Error('[range] is required')
    if ( !outputModule ) throw new Error('[output-module] is required')
    if ( !spreadsheetId ) throw new Error('[spreadsheet-id] is required')
    if ( !api_token ) throw new Error('[substreams-api-token] is required')
    if ( !options.credentials ) throw new Error('[credentials] is required')

    // delay before start
    if ( options.delayBeforeStart ) await timeout(Number(options.delayBeforeStart) * 1000);
    
    // Authenticate Google Sheets
    const sheets = await authenticateGoogle(options.credentials)

    // Download Substream from URL or IPFS
    const spkg = await download(url)

    // Initialize Substreams
    const substreams = new Substreams(spkg, outputModule, {
        host: substreamsEndpoint,
        startBlockNum: options.startBlock,
        stopBlockNum: options.stopBlock,
        authorization: api_token
    })

    // Find Protobuf message types from registry
    const { registry } = unpack(spkg)
    const DatabaseChanges = getDatabaseChanges(registry)

    const rows: string[][] = []
    let isSubstreamRunning = true; // Semi-colon important here to not mess up the following declaration

    (function pushToSheet() {
        if ( rows.length ) {
            appendRows(sheets, spreadsheetId, range, rows)
            logger.info('Pushed rows to Google Sheet', {spreadsheetId, range, rows: rows.length})
            rows.length = 0 // Reset the rows queue -> Is there potential race with `substream.on` event (= loss of data) ?
        }

        if ( isSubstreamRunning )
            setTimeout(pushToSheet, TIMEOUT) // TODO: More robust in case of failed push
    })()

    substreams.on('mapOutput', async (output, clock: Clock) => {
        // Handle map operations, type URL is in format `type.googleapis.com/xxx`
        if ( !MESSAGE_TYPE_NAMES.some(( message: string ) => output.data.value.typeUrl.match(message)) ) return

        const decoded = DatabaseChanges.fromBinary(output.data.value.value) as any    
        const databaseChanges = parseDatabaseChanges(decoded, clock)

        // If no columns specified, determine from the returned data as we'll include all fields
        if ( !columns.length ) columns = [...Object.keys(databaseChanges[0]).values()]
        rows.push(...databaseChanges.map(changes => formatRow(changes, columns)))

        logger.info('Rows added to queue', {spreadsheetId, range, rows: rows.length})
    })

    substreams.on('end' as any, async (cursor: string, clock: Clock) => {
        isSubstreamRunning = false
        if ( addHeaderRow ) {
            if ( await insertHeaderRow(sheets, spreadsheetId, range, columns) )
                logger.info('insertHeaderRow', {columns, spreadsheetId})
        }
    })

    // start streaming Substream
    logger.info('start', {
        host: substreamsEndpoint,
        outputModule: outputModule,
        startBlockNum: options.startBlock,
        stopBlockNum: options.stopBlock,
    })

    try {
        substreams.start()
    } catch {
        isSubstreamRunning = false
    }

    return substreams
}

export async function list(url: string) {
    const spkg = await download(url)
    const { modules } = unpack(spkg)
    const compatible = []

    for ( const {name, output} of modules.modules ) {
        if ( !output ) continue
        logger.info('module', {name, output})
        if ( !MESSAGE_TYPE_NAMES.includes(output.type.replace('proto:', '')) ) continue
        compatible.push(name)
    }

    return compatible
}

export async function create(credentials: Credentials) {
    // Authenticate Google Sheets
    const sheets = await authenticateGoogle(credentials)

    // Create spreadsheet
    const spreadsheetId = await createSpreadsheet(sheets, 'substreams-sink-sheets by Pinax')
    if ( !spreadsheetId ) throw new Error('Could not create spreadsheet')

    return spreadsheetId
}