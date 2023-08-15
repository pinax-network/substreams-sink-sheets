import { Clock } from '@substreams/core/proto'
import { createSpreadsheet } from './src/google.js'
import { authenticateGoogle, type Credentials } from './src/auth.js'
import PQueue from 'p-queue';

export * from './src/google.js'
export * from './src/auth.js'

import type { ActionOptions } from './bin/cli.js'
import { handleCredentials } from './bin/auth.js'
import { http, logger, setup } from 'substreams-sink'
import { handleOutput } from './src/handlers.js';

export async function run(options: ActionOptions) {
    if (!options.range) throw new Error('[range] is required')
    if (!options.spreadsheetId) throw new Error('[spreadsheet-id] is required')
    const credentials = await handleCredentials(options);

    // Authenticate Google Sheets
    const sheets = await authenticateGoogle(credentials)
    logger.info("Authenticated with Google Sheets");

    // Setup substreams
    const { emitter } = await setup(options);
    const queue = new PQueue({concurrency: 1});

    emitter.on('output', async (message: any, cursor: string, clock: Clock) => {
        queue.add(async () => handleOutput(sheets, message, cursor, clock, options));
    })

    await http.listen(options);
    await emitter.start();
    console.log("Checking if queue is empty...");
    await queue.onEmpty();
}

export async function create(credentials: Credentials) {
    // Authenticate Google Sheets
    const sheets = await authenticateGoogle(credentials)

    // Create spreadsheet
    const spreadsheetId = await createSpreadsheet(sheets, 'substreams-sink-sheets by Pinax')
    if (!spreadsheetId) throw new Error('Could not create spreadsheet')

    return spreadsheetId
}