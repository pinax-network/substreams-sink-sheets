import { applyParams, createRegistry, createRequest, getModuleOrThrow, getModules } from '@substreams/core'
import { Clock, Module_Input_Store, Module_Input_Map } from '@substreams/core/proto'
import { readPackage } from '@substreams/manifest'
import { BlockEmitter, createDefaultTransport } from '@substreams/node'
import { type DatabaseChanges, parseDatabaseChanges, getDatabaseChanges } from './src/database_changes.js'
import { createSpreadsheet, formatRow, appendRows, insertHeaderRow } from './src/google.js'
import { authenticateGoogle, type Credentials } from './src/auth.js'
import { logger } from './src/logger.js'

export * from './src/google.js'
export * from './src/database_changes.js'
export * from './src/auth.js'

import { timeout } from './src/utils.js'
import * as dotenv from 'dotenv'
dotenv.config()

const TIMEOUT = 1000 // rate limit on Google API is 100 requests per 100 seconds
export const MESSAGE_TYPE_NAMES = [
    'sf.substreams.sink.database.v1.DatabaseChanges',
    'sf.substreams.database.v1.DatabaseChanges'
]
export const MESSAGE_TYPE_NAME = MESSAGE_TYPE_NAMES[0]
export const DEFAULT_API_TOKEN_ENV = 'SUBSTREAMS_API_TOKEN'
export const DEFAULT_OUTPUT_MODULE = 'db_out'
export const DEFAULT_OUTPUT_MODULE_PARAMS = ''
export const DEFAULT_SUBSTREAMS_ENDPOINT = 'https://mainnet.eth.streamingfast.io:443'
export const DEFAULT_COLUMNS = []
export const DEFAULT_ADD_HEADER_ROW = false
export const DEFAULT_RANGE = 'Sheet1'

export async function run(url: string, spreadsheetId: string, options: {
    // substreams options
    outputModule?: string,
    outputModuleParams?: string,
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
    const outputModuleParams = options.outputModuleParams ?? DEFAULT_OUTPUT_MODULE_PARAMS
    const substreamsEndpoint = options.substreamsEndpoint ?? DEFAULT_SUBSTREAMS_ENDPOINT
    const addHeaderRow = options.addHeaderRow ?? DEFAULT_ADD_HEADER_ROW
    const range = options.range ?? DEFAULT_RANGE
    const api_token_envvar = options.substreamsApiTokenEnvvar ?? DEFAULT_API_TOKEN_ENV
    const api_token = options.substreamsApiToken ?? process.env[api_token_envvar]
    let columns = options.columns ?? DEFAULT_COLUMNS

    if (!range) throw new Error('[range] is required')
    if (!outputModule) throw new Error('[output-module] is required')
    if (!spreadsheetId) throw new Error('[spreadsheet-id] is required')
    if (!api_token) throw new Error('[substreams-api-token] is required')
    if (!options.credentials) throw new Error('[credentials] is required')

    // delay before start
    if (options.delayBeforeStart) await timeout(Number(options.delayBeforeStart) * 1000);

    // Authenticate Google Sheets
    const sheets = await authenticateGoogle(options.credentials)

    // Download Substream from URL or IPFS
    const spkg = await readPackage(url)

    if (outputModuleParams !== '') {
        const outModule = getModuleOrThrow(getModules(spkg), outputModule)// Object.values(spkg.modules.modules).find( m => m.name === outputModule )

        const mapOrStoreInput = outModule.inputs.find(i => i.input.case === 'map' || i.input.case === 'store')?.input.value as Module_Input_Map | Module_Input_Store | undefined
        const isParamModule = outModule.inputs.find(i => i.input.case === 'params') !== undefined

        /* Check if the output module is based on a map or store to pass the parameters to the right module
        Example :
            {
                "1": {
                    ...
                    "inputs": [
                        // If 'db_out' is the output module, we need to pass the params to 'map_transfers_from'
                        { "map": { "moduleName": "map_transfers_from" } }
                    ],
                    "name":"db_out",
                    ...
                }
            }
        */
        let paramModule = outputModule
        if (!isParamModule && mapOrStoreInput)
            paramModule = mapOrStoreInput?.moduleName

        if (!spkg.modules?.modules)
            throw new Error('No modules found in substream package !')

        applyParams([`${paramModule}=${outputModuleParams}`], spkg.modules.modules)
    }

    // Initialize Substreams
    const registry = createRegistry(spkg)
    const headers = new Headers({ 'User-Agent': '@substreams/node' })
    const transport = createDefaultTransport(substreamsEndpoint, api_token, registry, headers)
    const request = createRequest({
        substreamPackage: spkg,
        outputModule,
        startBlockNum: options.startBlock as any,
        stopBlockNum: options.stopBlock as any,
        productionMode: true,
    })
    const substreams = new BlockEmitter(transport, request, registry)

    // Find Protobuf message types from registry
    const DatabaseChanges = getDatabaseChanges(registry)

    const rows: string[][] = []
    let isSubstreamRunning = true; // Semi-colon important here to not mess up the following declaration

    (async function pushToSheet() {
        if (rows.length) {
            appendRows(sheets, spreadsheetId, range, rows)
            logger.info('Pushed rows to Google Sheet', { spreadsheetId, range, rows: rows.length })
            rows.length = 0 // Reset the rows queue -> Is there potential race with `substream.on` event (= loss of data) ?
        }

        if (isSubstreamRunning) {
            setTimeout(pushToSheet, TIMEOUT) // TODO: More robust in case of failed push
        } else if (addHeaderRow) {
            if (await insertHeaderRow(sheets, spreadsheetId, range, columns))
                logger.info('insertHeaderRow', { columns, spreadsheetId })
        }
    })()

    substreams.on('anyMessage', async (message, cursor: string, clock: Clock) => {
        const decoded = DatabaseChanges.fromJson(message) as DatabaseChanges
        const databaseChanges = parseDatabaseChanges(decoded, clock)

        if (databaseChanges.length) {
            // If no columns specified, determine them from the returned object keys to include all fields
            if (!columns.length) columns = [...Object.keys(databaseChanges[0]).values()]
            rows.push(...databaseChanges.map(changes => formatRow(changes, columns)))

            logger.info('Rows added to queue', { spreadsheetId, range, rows: rows.length })
        }
    })

    // start streaming Substream
    logger.info('start', {
        host: substreamsEndpoint,
        outputModule,
        outputModuleParams,
        startBlockNum: options.startBlock,
        stopBlockNum: options.stopBlock
    })

    await substreams.start()
    isSubstreamRunning = false

    return substreams
}

export async function list(url: string) {
    const spkg = await readPackage(url)
    const compatible = []

    for (const { name, output } of getModules(spkg)) {
        if (!output) continue
        logger.info('module', { name, output })
        if (!MESSAGE_TYPE_NAMES.includes(output.type.replace('proto:', ''))) continue
        compatible.push(name)
    }

    return compatible
}

export async function create(credentials: Credentials) {
    // Authenticate Google Sheets
    const sheets = await authenticateGoogle(credentials)

    // Create spreadsheet
    const spreadsheetId = await createSpreadsheet(sheets, 'substreams-sink-sheets by Pinax')
    if (!spreadsheetId) throw new Error('Could not create spreadsheet')

    return spreadsheetId
}