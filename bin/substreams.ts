import { Substreams, download } from 'substreams'
import { handleDecoded } from './handler'
import { authenticate, createSpreadsheet, hasHeaderRow, writeHeaderRow } from './google'

export async function run(spkg: string, credentials: string, args: {
    spreadsheetId?: string,
    outputModule?: string,
    startBlock?: string,
    stopBlock?: string,
    substreamsEndpoint?: string,
    columns?: string[],
    addHeaderRow?: boolean
} = {}) {
    authenticate(credentials)

    let spreadsheetId = args.spreadsheetId ?? ''

    if ( !spreadsheetId ) {
        // NOTE: If service account, user cannot access it... -> Need to switch to OAuth only
        spreadsheetId = await createSpreadsheet('substreams-sink-sheets by Pinax') ?? ''
        if ( !spreadsheetId ) {
            console.error('[-] Could not create new spreadsheet !')
            return
        } else {
            console.log(`[+] Created new spreadsheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`)
        }
    }

    const columns = args.columns ?? []

    if ( args.addHeaderRow && columns.length > 0 && ! await hasHeaderRow(spreadsheetId) ){
        await writeHeaderRow(spreadsheetId, columns)
        console.log(`[+] Wrote headers "${columns}" to "${spreadsheetId}"`)
    }

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
    if ( !DatabaseChanges ) throw new Error(`Could not find [${messageTypeName}] message type`)

    substreams.on('mapOutput', (output, clock) => {
        // Handle map operations
        if ( !output.data.mapOutput.typeUrl.match(messageTypeName) ) return
        const decoded = DatabaseChanges.fromBinary(output.data.mapOutput.value) as any    
        handleDecoded(decoded, clock, spreadsheetId, columns)
    })

    // start streaming Substream
    await substreams.start(modules)
}

export async function list(spkg: string) {
    const { modules, } = await download(spkg)
    const messageTypeName = 'sf.substreams.sink.database.v1.DatabaseChanges'

    console.log(`Compatible modules: ${modules.modules.filter(x => x?.output?.type == `proto:${messageTypeName}`).map(v => v.name)}`)
}