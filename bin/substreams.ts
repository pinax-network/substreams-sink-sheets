import { Substreams, download } from 'substreams'
import { handleOperation } from './handler'

export async function run(spkg: string, sheets_url: string, args: {
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
        for ( const operation of decoded.tableChanges ) {
            handleOperation(operation.toJson(), clock)
        }
    })

    // start streaming Substream
    await substreams.start(modules)
}
