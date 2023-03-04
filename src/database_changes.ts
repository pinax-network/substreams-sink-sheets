import { Clock } from 'substreams'
import { MESSAGE_TYPE_NAME, MESSAGE_TYPE_NAMES } from '..';

export interface DatabaseChanges {
    tableChanges: TableChange[];
}

export enum Operation {
    UNSET = 0,    // Protobuf default should not be used, this is used so that the consume can ensure that the value was actually specified
    CREATE = 1,
    UPDATE = 2,
    DELETE = 3,
}
  
export interface TableChange {
    table: string;
    pk: string;
    ordinal: number;
    operation: Operation;
    fields: Field[];
}

export interface Field {
    name: string;
    newValue: string;
    oldValue: string;
}

// Find Protobuf message types from registry
export function getDatabaseChanges(registry: any) {
    for ( const message of MESSAGE_TYPE_NAMES ) {
        try {
            return registry.findMessage(message);

        } catch (error) {
            // ignore
        }
    }
    throw new Error(`Could not find [${MESSAGE_TYPE_NAME}] message type`)
}

export function parseDatabaseChanges(decoded: DatabaseChanges, clock: Clock) {
    const tableChanges: any[] = []

    for ( const { table, pk, ordinal, operation, fields } of decoded.tableChanges ) {
        // only supports CREATE
        if ( operation != Operation.CREATE ) continue

        // extractable JSON data
        const base_json = { table, pk, ordinal: String(ordinal), operation: operation }
        const fields_json = fields_to_json(fields)
        const clock_json = clock_to_json(clock)

        // merge & push all JSON data
        tableChanges.push(Object.assign(base_json, clock_json, fields_json))
    }

    return tableChanges
}

function clock_to_json(clock: Clock) {
    const block_number = clock.number
    const seconds = Number(clock.timestamp?.seconds)
    const nanos = Number(clock.timestamp?.nanos)
    const ms = nanos / 1000000
    const timestamp = seconds * 1000 + ms
    const date = new Date(timestamp).toISOString()
    const [year, month, day] = date.split('T')[0].split('-')

    // base data
    return {
        date,
        year,
        month,
        day,
        timestamp,
        seconds,
        block_number,
        block_num: block_number,
    }
}

function fields_to_json(fields: Field[]) {
    const json: any = {}

    for ( const { name, newValue } of fields ) {
        if ( newValue == undefined ) continue // skip if empty
        json[name] = String(newValue)
    }

    return json
}