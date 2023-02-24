import { Substreams, download } from 'substreams'
import { parseDatabaseChanges } from './src/database_changes'
import { createSpreadsheet, format_row, hasHeaderRow, insertRows } from './src/google'
import { authenticate, read_credentials } from './src/auth'

export * from "./src/google";
export * from "./src/database_changes";
export * from "./src/auth";

export const MESSAGE_TYPE_NAME = 'sf.substreams.sink.database.v1.DatabaseChanges'

export async function run(spkg: string, credentials: string, args: {
    spreadsheetId?: string,
    outputModule?: string,
    startBlock?: string,
    stopBlock?: string,
    substreamsEndpoint?: string,
    columns?: string[],
    addHeaderRow?: boolean,
    range?: string,
} = {}) {
    // User params
    const columns = args.columns ?? [];
    let spreadsheetId = args.spreadsheetId || '';
    const range = args.range;
    
    if ( !range ) throw new Error('[range] is required')
    if ( !args.outputModule ) throw new Error('[outputModule] is required')
    if ( !columns.length ) throw new Error('[columns] is empty');
    if ( !credentials ) throw new Error('[credentials] is required')
    
    // Authenticate Google Sheets
    const sheets = await authenticate(read_credentials(credentials));
    
    // NOTE: If service account, user cannot access it... -> Need to switch to OAuth only
    if ( !spreadsheetId ) spreadsheetId = await createSpreadsheet(sheets, 'substreams-sink-sheets by Pinax');
    if ( !spreadsheetId ) throw new Error('[spreadsheetId] is required')
    
    // Add header row if not exists
    if ( args.addHeaderRow ) {
        if ( !await hasHeaderRow(sheets, spreadsheetId, range) ) {
            await insertRows(sheets, spreadsheetId, range, [columns]);
            console.log(`[+] Wrote headers "${columns}" to "${spreadsheetId}"`)
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
        const databaseChanges = parseDatabaseChanges(decoded, clock);
        const rows = databaseChanges.map(changes => format_row(changes, columns));
        await insertRows(sheets, spreadsheetId, range, rows);
    })

    // start streaming Substream
    await substreams.start(modules)
}

export async function list(spkg: string) {
    const { modules } = await download(spkg);
    for ( const module of modules.modules ) {
        if ( !module.output?.type.includes(MESSAGE_TYPE_NAME) ) continue;
        console.log(`Compatible modules: ${module.name}`);
    }
}