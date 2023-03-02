#!/usr/bin/env node

import { Command } from 'commander'
import { run, list, create } from '../index'
import { logger } from "../src/logger"
import { handleCredentials } from "./auth";
import pkg from '../package.json'
import {
    DEFAULT_API_TOKEN_ENV,
    DEFAULT_OUTPUT_MODULE,
    DEFAULT_SUBSTREAMS_ENDPOINT,
    DEFAULT_COLUMNS,
    DEFAULT_ADD_HEADER_ROW,
    DEFAULT_RANGE,
} from '../index'

const program = new Command()

function commaSeparatedList(value: string) {
    return value.split(',')
}

program.name('substreams-sink-sheets')
    .version(pkg.version, '-v, --version', 'version for substreams-sink-sheets')

program.command('run')
    .showHelpAfterError()
    .description('Push data from a Substreams DatabaseChanges map output to a Google Sheets spreadsheet')
    .argument('<spkg>', 'URL or IPFS hash of Substreams package')
    .argument('<spreadsheet-id>', 'ID of Google Sheets spreadsheet to write output to (i.e. https://docs.google.com/spreadsheets/d/{ID}/edit)')
    .option('-m --output-module <string>', 'Name of the output module (declared in the manifest)', DEFAULT_OUTPUT_MODULE)
    .option('-e --substreams-endpoint <string>', 'Substreams gRPC endpoint to stream data from', DEFAULT_SUBSTREAMS_ENDPOINT)
    .option('-s --start-block <int>', 'Start block to stream from (defaults to -1, which means the initialBlock of the first module you are streaming)')
    .option('-t --stop-block <string>', 'Stop block to end stream at, inclusively')
    .option('-c --columns <items>', 'Output columns filter as a comma-separated list', commaSeparatedList, DEFAULT_COLUMNS)
    .option('--add-header-row', 'Add the name of the columns to the first row of the spreadsheet', DEFAULT_ADD_HEADER_ROW)
    .option('--range <string>', 'The A1 notation of the table range', DEFAULT_RANGE)
    .option('--access-token <string>', 'Google OAuth2 access token')
    .option('--refresh-token <string>', 'Google OAuth2 refresh token')
    .option('--service-account-file <string>', 'Google Service account keys JSON file')
    .option('--substreams-api-token <string>', 'API token for the substream endpoint')
    .option('--substreams-api-token-envvar <string>', 'Environnement variable name of the API token for the substream endpoint', DEFAULT_API_TOKEN_ENV)
    .action(async (spkg: string, spreadsheetId: string, options: any) => {
        const credentials = await handleCredentials(options);
        options['credentials'] = credentials;
        await run(spkg, spreadsheetId, options);
    })

program.command('list')
    .showHelpAfterError()
    .description('List all compatible output modules for a given Substreams package')
    .argument('<spkg>', 'URL or IPFS hash of Substreams package')
    .action(async spkg => {
        const modules = await list(spkg);
        logger.info('list', {modules})
        process.stdout.write(JSON.stringify(modules) + '\n')
    })

program.command('create')
    .showHelpAfterError()
    .description('Create a new Google Sheets spreadsheet and return the ID')
    .option('--access-token <string>', 'Google OAuth access token')
    .option('--refresh-token <string>', 'Google OAuth refresh token')
    .option('--service-account-file <string>', 'Google Service account keys JSON file')
    .action(async (options: any) => {
        const credentials = await handleCredentials(options);
        const spreadsheetId = await create(credentials);
        logger.info('create', {spreadsheetId})
        process.stdout.write(JSON.stringify({
            spreadsheetId,
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        }) + '\n');
    })

program.command('completion').description('Generate the autocompletion script for the specified shell')
program.command('help').description('Display help for command')
program.showHelpAfterError()
program.parse()
