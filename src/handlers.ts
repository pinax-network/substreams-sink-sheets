import type { Clock } from "@substreams/core/proto"
import type { Message, AnyMessage } from "@bufbuild/protobuf"
import type { ActionOptions } from "../bin/cli.js";
import type { sheets_v4 } from "googleapis";
// import { createSpreadsheet, formatRow, appendRows, insertHeaderRow } from './google.js'

export interface EntityChanges {
    entityChanges: EntityChange[];
}

export interface EntityChange {
    entity:    string;
    id:        string;
    operation: string;
    fields:    Field[];
}

export interface Field {
    name:     string;
    newValue: NewValue;
}

export interface NewValue {
    bigint?: string;
    string?: Date;
}


export async function handleOutput(sheets: sheets_v4.Sheets, message: Message<AnyMessage>, cursor: string, clock: Clock, options: ActionOptions) {
    const type = await message.getType();
    switch (type.typeName.toString()) {
        case "sf.substreams.sink.entity.v1.EntityChanges":
            return handleEntityChanges(sheets, message as any, clock, options);
    }
}

export async function handleEntityChanges(sheets: sheets_v4.Sheets, message: EntityChanges, clock: Clock, options: ActionOptions) {
    const entityChanges = message?.entityChanges || [];
    return Promise.all(entityChanges.map(entityChange => {
        handleEntityChange(sheets, entityChange, clock, options)
    }));
}

export async function handleEntityChange(sheets: sheets_v4.Sheets, entityChange: EntityChange, clock: Clock, options: ActionOptions) {
    console.log(entityChange);
}

// for ( const entityChange of message.entityChanges ) {
//     queue.add(async () => handleOutput(client, message, cursor, clock, options));
//     logger.info('Rows added to queue', { spreadsheetId, range, rows: rows.length })
//     // If no columns specified, determine them from the returned object keys to include all fields
//     // if (!columns.length) columns = [...Object.keys(databaseChanges[0]).values()]
//     // rows.push(...databaseChanges.map(changes => formatRow(changes, columns)))
// }


// // Use PQueue to ensure that the substream.on event is not called concurrently
// (async function pushToSheet() {
//     if (rows.length) {
//         appendRows(sheets, options.spreadsheetId, options.range, rows)
//         logger.info('Pushed rows to Google Sheet', { spreadsheetId, range, rows: rows.length })
//         rows.length = 0 // Reset the rows queue -> Is there potential race with `substream.on` event (= loss of data) ?
//     }

//     if (isSubstreamRunning) {
//         setTimeout(pushToSheet, TIMEOUT) // TODO: More robust in case of failed push
//     } else if (options.addHeaderRow) {
//         if (await insertHeaderRow(sheets, options.spreadsheetId, options.range, options.columns))
//             logger.info('insertHeaderRow', { columns: options.columns, spreadsheetId: options.spreadsheetId, range: options.range })
//     }
// })()