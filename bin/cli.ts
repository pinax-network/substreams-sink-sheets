#!/usr/bin/env node

import { Command } from 'commander'
import { run, list } from './substreams'
import pkg from '../package.json'

const program = new Command()

function commaSeparatedList(value: string) {
    return value.split(',')
}

program.name('substreams-sink-sheets')
    .version(pkg.version, '-v, --version', 'version for substreams-sink-sheets')

program.command('run')
    .description('Push data from a Substreams DatabaseChanges map output to a Google Sheets spreadsheet')
    .argument('<spkg>', 'URL or IPFS hash of Substreams package')
    .argument('<spreadsheet-id>', 'ID of Google Sheets spreadsheet to write output to (i.e. https://docs.google.com/spreadsheets/d/{ID}/edit)')
    .argument('<credentials>', '.json file containing the credentials for a Google API Service Account (see https://support.google.com/a/answer/7378726?hl=en)')
    .option('-m --output-module <string>', 'Name of the output module (declared in the manifest)', 'db_out')
    .option('-e --substreams-endpoint <string>', 'Substreams gRPC endpoint', 'eos.firehose.eosnation.io:9001')
    .option('-s --start-block <int>', 'Start block to stream from (defaults to -1, which means the initialBlock of the first module you are streaming)', '-1')
    .option('-t --stop-block <string>', 'Stop block to end stream at, inclusively', '0')
    .option('--columns <items>', 'Output columns filter (comma separated list)', commaSeparatedList, [])
    .option('--add-header-row <bool>', 'Add the name of the columns to the first row of the spreadsheet ', false)
    .action(run)

program.command('list')
    .description('List all compatible output modules for a given Substreams package')
    .argument('<spkg>', 'URL or IPFS hash of Substreams package')
    .action(list)

program.command('completion').description('Generate the autocompletion script for the specified shell')
program.command('help').description('Display help for command')
program.parse()
