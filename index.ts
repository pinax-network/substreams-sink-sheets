import PQueue from 'p-queue'
import { Substreams, download, Clock } from 'substreams'
import { parseDatabaseChanges } from './src/database_changes'
import { createSpreadsheet, formatRow, appendRows, insertRows, getSheetId } from './src/google'
import { authenticateGoogle, Credentials } from './src/auth'
import { logger } from './src/logger'

export * from './src/google'
export * from './src/database_changes'
export * from './src/auth'

import * as dotenv from 'dotenv'
dotenv.config()

const TIMEOUT = 1000 // rate limit on Google API is 100 requests per 100 seconds
export const MESSAGE_TYPE_NAME = 'sf.substreams.sink.database.v1.DatabaseChanges'
export const DEFAULT_API_TOKEN_ENV = 'SUBSTREAMS_API_TOKEN'
export const DEFAULT_OUTPUT_MODULE = 'db_out'
export const DEFAULT_SUBSTREAMS_ENDPOINT = 'mainnet.eth.streamingfast.io:443'
export const DEFAULT_COLUMNS = []
export const DEFAULT_ADD_HEADER_ROW = false
export const DEFAULT_RANGE = 'Sheet1'

export async function run(spkg: string, spreadsheetId: string, options: {
    // substreams options
    outputModule?: string,
    substreamsEndpoint?: string,
    startBlock?: string,
    stopBlock?: string,
    substreamsApiToken?: string,
    substreamsApiTokenEnvvar?: string

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
    
    // Authenticate Google Sheets
    const sheets = await authenticateGoogle(options.credentials)

    // Initialize Substreams
    const substreams = new Substreams(outputModule, {
        host: substreamsEndpoint,
        startBlockNum: options.startBlock,
        stopBlockNum: options.stopBlock,
        authorization: api_token
    })

    // Download Substream from URL or IPFS
    const { modules, registry } = await download(spkg)

    // Find Protobuf message types from registry
    const DatabaseChanges = registry.findMessage(MESSAGE_TYPE_NAME)
    if ( !DatabaseChanges ) throw new Error(`Could not find [${MESSAGE_TYPE_NAME}] message type`)

    let count = 0
    const queue = new PQueue({concurrency: 1, timeout: TIMEOUT})
    queue.on('active', () => {
        logger.info(`Working on item #${++count} / Size: ${queue.size} / Pending: ${queue.pending}`)
    })

    substreams.on('mapOutput', async (output, clock: Clock) => {
        // Handle map operations
        if ( !output.data.mapOutput.typeUrl.match(MESSAGE_TYPE_NAME) ) return

        const decoded = DatabaseChanges.fromBinary(output.data.mapOutput.value) as any    
        const databaseChanges = parseDatabaseChanges(decoded, clock)

        // If no columns specified, determine from the returned data as we'll include all fields
        if ( !columns.length ) columns = [...Object.keys(databaseChanges[0]).values()]
        const rows = databaseChanges.map(changes => formatRow(changes, columns))

        queue.add(() => appendRows(sheets, spreadsheetId, range, rows))
        logger.info('appendRows added to queue', {spreadsheetId, range, rows: rows.length})
    })

    substreams.on('end' as any, async (cursor: string, clock: Clock) => {
        logger.info('Substream ended:', addHeaderRow)
        if ( addHeaderRow ) {
            await insertRows(sheets, spreadsheetId, {
                sheetId: await getSheetId(sheets, spreadsheetId, range),
                startRowIndex: 0,
                endRowIndex: 1
            }, [columns])
            logger.info('addHeaderRow', {columns, spreadsheetId})
        }
    })

    // start streaming Substream
    logger.info('start', {
        host: substreamsEndpoint,
        outputModule: outputModule,
        startBlockNum: options.startBlock,
        stopBlockNum: options.stopBlock,
    })
    substreams.start(modules)
    return substreams
}

export async function list(spkg: string) {
    const { modules } = await download(spkg)
    const compatible = []

    for ( const module of modules.modules ) {
        if ( !module.output?.type.includes(MESSAGE_TYPE_NAME) ) continue
        compatible.push(module.name)
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