import { Substreams, download } from 'substreams'
import { parseDatabaseChanges } from './src/database_changes'
import { createSpreadsheet, formatRow, hasHeaderRow, insertRows } from './src/google'
import { authenticate } from './src/auth'
import { logger } from './src/logger'

export * from './src/google'
export * from './src/database_changes'
export * from './src/auth'

export const MESSAGE_TYPE_NAME = 'sf.substreams.sink.database.v1.DatabaseChanges'
export const DEFAULT_OUTPUT_MODULE = 'db_out'
export const DEFAULT_SUBSTREAMS_ENDPOINT = 'mainnet.eth.streamingfast.io:443'
export const DEFAULT_COLUMNS = ['timestamp', 'block_num']
export const DEFAULT_ADD_HEADER_ROW = true
export const DEFAULT_RANGE = 'Sheet1'

export async function run(spkg: string, spreadsheetId: string, credentials: string[], api_key: string, args: {
    outputModule?: string,
    startBlock?: string,
    stopBlock?: string,
    substreamsEndpoint?: string,
    columns?: string[],
    addHeaderRow?: boolean,
    range?: string,
} = {}) {
    // User params
    const outputModule = args.outputModule ?? DEFAULT_OUTPUT_MODULE
    const substreamsEndpoint = args.substreamsEndpoint ?? DEFAULT_SUBSTREAMS_ENDPOINT
    const columns = args.columns ?? DEFAULT_COLUMNS
    const addHeaderRow = args.addHeaderRow ?? DEFAULT_ADD_HEADER_ROW
    const range = args.range ?? DEFAULT_RANGE

    if ( !range ) throw new Error('[range] is required')
    if ( !outputModule ) throw new Error('[outputModule] is required')
    if ( !columns.length ) throw new Error('[columns] is empty')
    if ( !spreadsheetId ) throw new Error('[spreadsheetId] is required')
    
    // Authenticate Google Sheets
    const sheets = await authenticate({ accessToken: credentials[0], refreshToken: credentials[1] })
    
    // Add header row if not exists
    if ( addHeaderRow ) {
        if ( !await hasHeaderRow(sheets, spreadsheetId, range) ) {
            await insertRows(sheets, spreadsheetId, range, [columns])
            logger.info('addHeaderRow', {columns, spreadsheetId})
        }
    }

    // Initialize Substreams
    const substreams = new Substreams(outputModule, {
        host: substreamsEndpoint,
        startBlockNum: args.startBlock,
        stopBlockNum: args.stopBlock,
        authorization: api_key
    })

    // Download Substream from URL or IPFS
    const { modules, registry } = await download(spkg)

    // Find Protobuf message types from registry
    const DatabaseChanges = registry.findMessage(MESSAGE_TYPE_NAME)
    if ( !DatabaseChanges ) throw new Error(`Could not find [${MESSAGE_TYPE_NAME}] message type`)

    substreams.on('mapOutput', async (output, clock) => {
        // Handle map operations
        if ( !output.data.mapOutput.typeUrl.match(MESSAGE_TYPE_NAME) ) return

        const decoded = DatabaseChanges.fromBinary(output.data.mapOutput.value) as any    
        const databaseChanges = parseDatabaseChanges(decoded, clock)
        const rows = databaseChanges.map(changes => formatRow(changes, columns))

        await insertRows(sheets, spreadsheetId, range, rows)
        logger.info('insertRows', {spreadsheetId, range, rows: rows.length})
    })

    // start streaming Substream
    logger.info('start', {
        host: substreamsEndpoint,
        outputModule: outputModule,
        startBlockNum: args.startBlock,
        stopBlockNum: args.stopBlock,
    })

    await substreams.start(modules)
}

export async function list(spkg: string) {
    const { modules } = await download(spkg)
    const compatible = []

    for ( const module of modules.modules ) {
        if ( !module.output?.type.includes(MESSAGE_TYPE_NAME) ) continue
        compatible.push(module.name)
    }

    logger.info('list', {modules: compatible})
    process.stdout.write(JSON.stringify(compatible))
}

export async function create(credentials: string[]) {
    // Authenticate Google Sheets
    const sheets = await authenticate({ accessToken: credentials[0], refreshToken: credentials[1] })

    // Create spreadsheet
    const spreadsheetId = await createSpreadsheet(sheets, 'substreams-sink-sheets by Pinax')
    if ( !spreadsheetId ) throw new Error('Could not create spreadsheet')

    // Log spreadsheetId
    logger.info('create', {spreadsheetId})
    process.stdout.write(spreadsheetId)
}