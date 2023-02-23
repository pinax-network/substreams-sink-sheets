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