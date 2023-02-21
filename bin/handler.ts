import { Clock } from 'substreams'

export function handleOperation(operation: TableChange, clock: Clock) {
    // handle clock timestamp
    const seconds = Number(clock.timestamp?.seconds)
    const nanos = Number(clock.timestamp?.nanos)
    const ms = nanos / 1000000
    const timestamp = seconds * 1000 + ms
    const date = new Date(timestamp)

    // base columns
    const base = {
        date: date.toISOString(),
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDay(),
        timestamp,
        seconds,
        block_number: clock.number,
        table: operation.table,
        operation: operation.operation,
    } as any

    console.log(`New data: ${JSON.stringify(base)}`)
}

enum Operation {
    UNSET = 0,
    CREATE = 1,
    UPDATE = 2,
    DELETE = 3,
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
    new_value: string;
    old_value: string;
}