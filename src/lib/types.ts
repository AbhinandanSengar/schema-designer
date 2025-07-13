export type RelationshipType = '1:1' | '1:N' | 'N:N';

export type Field = {
    id: string;
    name: string;
    type: string;
    isRequired?: boolean;
    isUnique?: boolean;
    isPrimary?: boolean;
    isForeign?: boolean;
    foreignRef?: { nodeId: string; fieldId: string };
    relationType?: RelationshipType;
}

export type TableNodeData = {
    tableName: string;
    fields: Field[];
    primaryKeys?: string[];
}