import { Substreams, download } from 'substreams'
import { parseDatabaseChanges } from './src/database_changes'
import { createSpreadsheet, formatRow, insertRows } from './src/google'
import { handle_google_authentication } from './src/auth'
import { logger } from './src/logger'

export * from './src/google'
export * from './src/database_changes'
export * from './src/auth'

export const MESSAGE_TYPE_NAME = 'sf.substreams.sink.database.v1.DatabaseChanges'
export const DEFAULT_API_TOKEN_ENV = 'SUBSTREAMS_API_TOKEN'
export const DEFAULT_OUTPUT_MODULE = 'db_out'
export const DEFAULT_SUBSTREAMS_ENDPOINT = 'mainnet.eth.streamingfast.io:443'
export const DEFAULT_COLUMNS = [] as string[]
export const DEFAULT_PREVIEW_DATA = false
export const DEFAULT_ADD_HEADER_ROW = true
export const DEFAULT_RANGE = 'Sheet1'

export async function run(spkg: string, spreadsheetId: string, options: {
    outputModule?: string,
    substreamsEndpoint?: string,
    startBlock?: string,
    stopBlock?: string,
    columns?: string[],
    previewData?: boolean,
    addHeaderRow?: boolean,
    range?: string,
    accessToken?: string,
    refreshToken?: string,
    credentials?: string,
    substreamsApiToken?: string,
    substreamsApiTokenEnvvar?: string
} = {}) {
    // User params
    const outputModule = options.outputModule ?? DEFAULT_OUTPUT_MODULE
    const substreamsEndpoint = options.substreamsEndpoint ?? DEFAULT_SUBSTREAMS_ENDPOINT
    const previewData = options.previewData ?? DEFAULT_PREVIEW_DATA
    const addHeaderRow = options.addHeaderRow ?? DEFAULT_ADD_HEADER_ROW
    const range = options.range ?? DEFAULT_RANGE
    const api_token_envvar = options.substreamsApiTokenEnvvar ?? DEFAULT_API_TOKEN_ENV
    const api_token = options.substreamsApiToken ?? process.env[api_token_envvar]
    let columns = options.columns ?? DEFAULT_COLUMNS

    if ( !range ) throw new Error('[range] is required')
    if ( !outputModule ) throw new Error('[output-module] is required')
    if ( !spreadsheetId ) throw new Error('[spreadsheet-id] is required')
    if ( !api_token ) throw new Error('[substreams-api-token] is required')
    
    // Authenticate Google Sheets
    const sheets = await handle_google_authentication({
        accessToken: options.accessToken,
        refreshToken: options.refreshToken,
        credentials: options.credentials
    })

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

    const substream_output_data = [] as any[]
    substreams.on('mapOutput', async (output, clock) => {
        // Handle map operations
        if ( !output.data.mapOutput.typeUrl.match(MESSAGE_TYPE_NAME) ) return

        const decoded = DatabaseChanges.fromBinary(output.data.mapOutput.value) as any    
        const databaseChanges = parseDatabaseChanges(decoded, clock)

        // If no columns specified, determine from the returned data as we'll include all fields
        if ( !columns.length ) columns = [...Object.keys(databaseChanges[0]).values()]

        if ( previewData ){
            for ( const changes of databaseChanges ) {
                const item = {} as any
                for ( const column of columns ) item[column] = changes[column]
                substream_output_data.push(item)
            }
        } else {
            const rows = databaseChanges.map(changes => formatRow(changes, columns))
            await insertRows(sheets, spreadsheetId, range, rows)
            logger.info('insertRows', {spreadsheetId, range, rows: rows.length})
        }
    })

    // start streaming Substream
    logger.info('start', {
        host: substreamsEndpoint,
        outputModule: outputModule,
        startBlockNum: options.startBlock,
        stopBlockNum: options.stopBlock,
    })

    await substreams.start(modules)

    if ( previewData ) {
        logger.info('Output data preview :')
        logger.info(JSON.stringify(substream_output_data[0], null, 2))
        //console.table(substream_output_data)
        return //substream_output_data
    } else if ( addHeaderRow ) {
        await insertRows(sheets, spreadsheetId, range + '!1:1', [columns])
        logger.info('addHeaderRow', {columns, spreadsheetId})
    }
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

export async function create(options: {
    accessToken?: string,
    refreshToken?: string,
    credentials?: string,
}) {
    // Authenticate Google Sheets
    const sheets = await handle_google_authentication(options)

    // Create spreadsheet
    const spreadsheetId = await createSpreadsheet(sheets, 'substreams-sink-sheets by Pinax')
    if ( !spreadsheetId ) throw new Error('Could not create spreadsheet')

    // Log spreadsheetId
    logger.info('create', {spreadsheetId})
    process.stdout.write(`Your spreadsheet is available at:\nhttps://docs.google.com/spreadsheets/d/${spreadsheetId}/edit\n`)
}