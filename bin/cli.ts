#!/usr/bin/env node

import pkg from "../package.json" assert { type: "json" };
import { commander, logger } from "substreams-sink";
import { Option } from "commander";
import { create, run } from "../index.js"
import { DEFAULT_COLUMNS, DEFAULT_ADD_HEADER_ROW, DEFAULT_RANGE } from '../src/config.js'
import { handleCredentials } from "./auth.js";

// function commaSeparatedList(value: string) {
//     return value.split(',')
// }

// Custom user options interface
export interface ActionOptions extends commander.RunOptions {
    spreadsheetId: string;
    columns: string[];
    kvRetentionPeriod: number;
    kvBucketDuration: number;
    addHeaderRow: boolean;
    range: string;
    accessToken: string;
    refreshToken: string;
    serviceAccountFile: string;
}

const program = commander.program(pkg);
commander.run(program, pkg)
.description('Push data from a Substreams DatabaseChanges map output to a Google Sheets spreadsheet')
    .showHelpAfterError()
    .addOption(new Option('--spreadsheet-id <string>', 'ID of Google Sheets spreadsheet to write output to (i.e. https://docs.google.com/spreadsheets/d/{ID}/edit)'))
    .addOption(new Option('--columns <items...>', 'Output columns filter').default(DEFAULT_COLUMNS))
    .addOption(new Option('--add-header-row', 'Add the name of the columns to the first row of the spreadsheet').default(DEFAULT_ADD_HEADER_ROW))
    .addOption(new Option('--range <string>', 'The A1 notation of the table range').default(DEFAULT_RANGE))
    .addOption(new Option('--access-token <string>', 'Google OAuth2 access token'))
    .addOption(new Option('--refresh-token <string>', 'Google OAuth2 refresh token'))
    .addOption(new Option('--service-account-file <string>', 'Google Service account keys JSON file'))
    .action(run);

program.command('create')
    .showHelpAfterError()
    .description('Create a new Google Sheets spreadsheet and return the ID')
    .option('--access-token <string>', 'Google OAuth access token')
    .option('--refresh-token <string>', 'Google OAuth refresh token')
    .option('--service-account-file <string>', 'Google Service account keys JSON file')
    .action(async (options: any) => {
        const credentials = await handleCredentials(options)
        const spreadsheetId = await create(credentials)
        logger.info('create', {spreadsheetId})
        process.stdout.write(JSON.stringify({
            spreadsheetId,
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        }) + '\n')
    })

logger.setName(pkg.name);
program.parse();
