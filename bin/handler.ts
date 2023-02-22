import { Clock } from 'substreams'

export function handleOperation(operation: TableChange, clock: Clock) {
    // handle clock timestamp
    const seconds = Number(clock.timestamp?.seconds)
    const nanos = Number(clock.timestamp?.nanos)
    const ms = nanos / 1000000
    const timestamp = seconds * 1000 + ms
    const date = new Date(timestamp)

    const row = {
        date: date.toISOString(),
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDay(),
        timestamp,
        seconds,
        blockNumber: clock.number,
        table: operation.table,
        pk: operation.pk,
        ordinal: operation.ordinal,
        operation: operation.operation,
    } as any

    if (operation.operation === Operation.CREATE || operation.operation === Operation.DELETE) {
        for (const field of operation.fields) {
            row[field.name] = field.newValue
        }        
    } else if (operation.operation === Operation.UPDATE) {
        for (const field of operation.fields) {
            row[field.name] = {new: field.newValue, old: field.oldValue}
        }
    } else {
        console.error(`Unsupported operation: ${JSON.stringify(row)}`)
        return
    }

    console.log(`${operation.operation} row: ${JSON.stringify(row)}`)
    return row
}

enum Operation {
    UNSET = 'UNSET',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
}

interface TableChange {
    table: string;
    pk: string;
    ordinal: bigint;
    operation: Operation;
    fields: Array<Field>;
}

interface Field {
    name: string;
    newValue: string;
    oldValue: string;
}