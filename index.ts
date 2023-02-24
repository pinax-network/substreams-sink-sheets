import { Substreams, download } from 'substreams'
import { parseDatabaseChanges } from './src/database_changes'
import { createSpreadsheet, format_row, hasHeaderRow, insertRows } from './src/google'
import { authenticate, parseCredentials } from './src/auth'
import { readFileSync } from './src/utils'
import { logger } from './src/logger'

export * from './src/google'
export * from './src/database_changes'
export * from './src/auth'

export const MESSAGE_TYPE_NAME = 'sf.substreams.sink.database.v1.DatabaseChanges'

export async function run(spkg: string, spreadsheetId: string, args: {
    outputModule?: string,
    startBlock?: string,
    stopBlock?: string,
    substreamsEndpoint?: string,
    columns?: string[],
    addHeaderRow?: boolean,
    range?: string,
    credentialsFile?: string, // filepath of Google Credentials
} = {}) {
    // User params
    const columns = args.columns ?? []
    const range = args.range

    if ( !range ) throw new Error('[range] is required')
    if ( !args.outputModule ) throw new Error('[outputModule] is required')
    if ( !columns.length ) throw new Error('[columns] is empty')
    if ( !args.credentialsFile ) throw new Error('[credentialsFile] is required')
    if ( !spreadsheetId ) throw new Error('[spreadsheetId] is required')
    
    // Authenticate Google Sheets
    const credentials = parseCredentials(readFileSync(args.credentialsFile))
    const sheets = await authenticate(credentials)
    logger.info('authenticate', {client_email: credentials.client_email})
    
    // Add header row if not exists
    if ( args.addHeaderRow ) {
        if ( !await hasHeaderRow(sheets, spreadsheetId, range) ) {
            await insertRows(sheets, spreadsheetId, range, [columns])
            logger.info('addHeaderRow', {columns, spreadsheetId})
        }
    }

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
    const DatabaseChanges = registry.findMessage(MESSAGE_TYPE_NAME)
    if ( !DatabaseChanges ) throw new Error(`Could not find [${MESSAGE_TYPE_NAME}] message type`)

    substreams.on('mapOutput', async (output, clock) => {
        // Handle map operations
        if ( !output.data.mapOutput.typeUrl.match(MESSAGE_TYPE_NAME) ) return
        const decoded = DatabaseChanges.fromBinary(output.data.mapOutput.value) as any    
        const databaseChanges = parseDatabaseChanges(decoded, clock)
        const rows = databaseChanges.map(changes => format_row(changes, columns))
        await insertRows(sheets, spreadsheetId, range, rows)
        logger.info('insertRows', {spreadsheetId, range, rows: rows.length})
    })

    // start streaming Substream
    logger.info('start', {
        host: args.substreamsEndpoint,
        outputModule: args.outputModule,
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
    // return compatible;
}

export async function create(args: {
    credentialsFile?: string, // filepath of Google Credentials
} = {}) {
    if ( !args.credentialsFile ) throw new Error('[credentialsFile] is required')

    // Authenticate Google Sheets
    const credentials = parseCredentials(readFileSync(args.credentialsFile))
    const sheets = await authenticate(credentials)

    // Create spreadsheet
    const spreadsheetId = await createSpreadsheet(sheets, 'substreams-sink-sheets by Pinax')
    if ( !spreadsheetId ) throw new Error('Could not create spreadsheet')

    // Log spreadsheetId
    logger.info('create', {spreadsheetId})
    process.stdout.write(spreadsheetId)
    // return spreadsheetId;
}