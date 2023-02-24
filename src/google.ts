import { sheets_v4 } from 'googleapis'
import { timeout } from "./utils";

type Sheets = sheets_v4.Sheets;
const TIMEOUT = 1000; // rate limit on Google API is 100 requests per 100 seconds

export async function readRange(sheets: Sheets, spreadsheetId: string, range: string) {
    return sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
}

export async function hasHeaderRow(sheets: Sheets, spreadsheetId: string, range: string) {
    try {
        const response = await readRange(sheets, spreadsheetId, range + "!1:1");
        return response.data.values != undefined;
    } catch (e) {
        return false;
    }
}

export async function createSpreadsheet(sheets: Sheets, title: string) {
    const response = await sheets.spreadsheets.create({
        fields: 'spreadsheetId',
    }, { body: JSON.stringify({ properties: { title }})});
    return response.data.spreadsheetId;
}

export async function insertRows(sheets: Sheets, spreadsheetId: string, range: string, rows: string[][]) {
    const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
    }, {body: JSON.stringify({ values: rows })});
    await timeout(TIMEOUT);
    return response;
}

export function format_row(object: {[key: string]: string}, columns: string[]) {
    const items = [];
    for ( const column of columns ) {
        const item: string = object[column];
        if ( !item ) items.push(""); // if blank, push empty string
        else items.push(item);
    }
    return items;
}