import { sheets_v4 } from 'googleapis'

type Sheets = sheets_v4.Sheets;

export async function readRange(sheets: Sheets, spreadsheetId: string, range: string) {
    return (await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    })).data
}

export async function createSpreadsheet(sheets: Sheets, title: string) {
    const response = await sheets.spreadsheets.create({
        fields: 'spreadsheetId',
    }, { body: JSON.stringify({ properties: { title }}) })

    return response.data.spreadsheetId
}

export async function insertHeaderRow(sheets: Sheets, spreadsheetId: string, sheet: string, headers: string[]) {
    const previousHeaderRowValues = await readRange(sheets, spreadsheetId, sheet + '!1:1')

    if ( !previousHeaderRowValues.values || JSON.stringify(previousHeaderRowValues.values[0]) !== JSON.stringify(headers) ) {
        return insertRows(sheets, spreadsheetId, {
            sheetId: await getSheetId(sheets, spreadsheetId, sheet),
            startRowIndex: 0,
            endRowIndex: 1
        }, [headers])
    }

    return null
}

export async function appendRows(sheets: Sheets, spreadsheetId: string, range: string, rows: string[][]) {
    const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
    }, { body: JSON.stringify({ values: rows }) })

    return response
}

export async function insertRows(sheets: Sheets, spreadsheetId: string, range: {
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
}, rows: string[][]) {
    const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
    }, { body: JSON.stringify({
        requests: [
            {
                insertRange: {
                    range,
                    shiftDimension: 'ROWS'
                }
            },
            {
                updateCells: {
                    rows: rows.map(row => ({
                        values: [
                            row.map(v => ({
                                userEnteredValue: {
                                    stringValue: v 
                                }
                            }))
                        ]})
                    ),
                    fields: '*',
                    range
                }
            }
        ],
        includeSpreadsheetInResponse: false
    })})

    return response
}

export async function getSheetId(sheets: Sheets, spreadsheetId: string, sheet: string) {
    const response = (await sheets.spreadsheets.get({spreadsheetId})).data

    if ( response.sheets ) return response.sheets.find((s: any) => s.properties.title === sheet)?.properties?.sheetId as number
    else throw new Error(`Could not retrieve Sheet Id of "${sheet}" for document "${spreadsheetId}"`)
}

export function formatRow(object: {[key: string]: string}, columns: string[]) {
    const items = []

    for ( const column of columns ) {
        const item: string = object[column]
        if ( !item ) items.push('') // if blank, push empty string
        else items.push(item)
    }

    return items
}
