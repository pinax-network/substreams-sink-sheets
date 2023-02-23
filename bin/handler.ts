import { Clock } from 'substreams'
import { appendToSheet } from './google'
import { DatabaseChanges, TableChange, Operation } from './interfaces'

export function handleDecoded(decoded: DatabaseChanges, clock: Clock, spreadsheetId: string, columns: string[]) {
    const rows: any[] = []
    for ( const operation of decoded.tableChanges ) {
        // handle clock timestamp
        const seconds = Number(clock.timestamp?.seconds)
        const nanos = Number(clock.timestamp?.nanos)
        const ms = nanos / 1000000
        const timestamp = seconds * 1000 + ms
        const date = new Date(timestamp).toISOString()
        const [year, month, day] = date.split('T')[0].split('-')

        // skip if not CREATE operation
        if ( operation.operation != Operation.CREATE ) continue

        // base data
        const base = {
            date,
            year,
            month,
            day,
            timestamp,
            seconds,
            block_number: clock.number,
            table: operation.table,
            pk: operation.pk,
            ordinal: operation.ordinal,
            operation: operation.operation,
        } as any

        // extracted json from `db_out` map output (will be override base data)
        const json = table_changes_to_json(operation, columns)
        const merged = Object.assign(base, json)
        if ( Array.isArray(columns) && columns.length > 0 ) {
            rows.push(columns.reduce((acc: any, key: string) => (acc[key] = merged[key], acc), {}))
        } else {
            rows.push(merged)
        }
    }

    appendToSheet(spreadsheetId, rows)
}

function table_changes_to_json(operation: TableChange, columns: string[]) {
    const json: any = {}
    for ( const { name, newValue } of operation.fields ) {
        json[name] = newValue
    }

    return json
}