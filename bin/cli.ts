#!/usr/bin/env node

import { Command } from 'commander'
import { run, list, create } from '../index'
import pkg from '../package.json'
import {
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
    .argument('<credentials>', 'Access and refresh tokens from Google OAuth2 (comma-separated).', commaSeparatedList)
    .option('-m --output-module <string>', 'Name of the output module (declared in the manifest)', DEFAULT_OUTPUT_MODULE)
    .option('-e --substreams-endpoint <string>', 'Substreams gRPC endpoint', DEFAULT_SUBSTREAMS_ENDPOINT)
    .option('-s --start-block <int>', 'Start block to stream from (defaults to -1, which means the initialBlock of the first module you are streaming)')
    .option('-t --stop-block <string>', 'Stop block to end stream at, inclusively')
    .option('--columns <items>', 'Output columns filter (comma separated list)', commaSeparatedList, DEFAULT_COLUMNS)
    .option('--add-header-row <bool>', 'Add the name of the columns to the first row of the spreadsheet ', DEFAULT_ADD_HEADER_ROW)
    .option('--range <string>', 'The A1 notation of the table range.', DEFAULT_RANGE)
    .action(run)

program.command('list')
    .showHelpAfterError()
    .description('List all compatible output modules for a given Substreams package')
    .argument('<spkg>', 'URL or IPFS hash of Substreams package')
    .action(list)

program.command('create')
    .showHelpAfterError()
    .description('Create a new Google Sheets spreadsheet and return the ID')
    .argument('<credentials>', 'Access and refresh tokens from Google OAuth2 (comma-separated).', commaSeparatedList)
    .action(create)

program.command('completion').description('Generate the autocompletion script for the specified shell')
program.command('help').description('Display help for command')
program.showHelpAfterError()
program.parse()
