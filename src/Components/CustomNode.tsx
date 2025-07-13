import type { Field, TableNodeData } from "@/lib/types";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { PencilLine, Plus, Trash2, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { nanoid } from "nanoid";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";


const fieldTypes = [
    'INTEGER', 'STRING', 'TEXT', 'BOOLEAN', 'DATE', 'DATETIME',
    'FLOAT', 'DECIMAL', 'JSON', 'UUID', 'ENUM'
];

type NodeProps = {
    id: string;
    data: TableNodeData;
};

export const CustomNode = ({ id, data }: NodeProps) => {
    const { fields, tableName } = data;
    const { setNodes } = useReactFlow();
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const updateNodeData = (newData: Partial<TableNodeData>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, ...newData } }
                    : node
            )
        );
    };

    const addField = () => {
        const newField: Field = {
            id: nanoid(),
            name: '',
            type: 'INTEGER',
            isRequired: false,
            isUnique: false,
            isPrimary: false
        };
        updateNodeData({ fields: [...fields, newField] });
    };

    const updateField = (fieldId: string, changes: Partial<Field>) => {
        const updatedFields = fields.map((field) =>
            field.id === fieldId ? { ...field, ...changes } : field
        );
        updateNodeData({ fields: updatedFields });
    };

    const deleteField = (fieldId: string) => {
        updateNodeData({ fields: fields.filter((f) => f.id !== fieldId) });
    };

    const handleTableNameChange = (name: string) => {
        updateNodeData({ tableName: name });
    };

    return (
        <div className="rounded-md border border-blue-300 bg-white w-[380px] shadow-md text-sm relative overflow-hidden">
            <div className="flex items-center justify-between bg-blue-50 px-4 py-3 border-b border-blue-200 font-semibold text-gray-800 group">
                {isEditing ? (
                    <input
                        autoFocus
                        value={tableName}
                        onChange={(e) => handleTableNameChange(e.target.value)}
                        onBlur={() => setIsEditing(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                ) : (
                    <>
                        <span className="truncate max-w-[300px]">{tableName}</span>
                        <PencilLine
                            className="w-4 h-4 text-gray-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-2 shrink-0"
                            onClick={() => setIsEditing(true)}
                        />
                    </>
                )}
            </div>

            <div className="px-3 py-2 space-y-2 max-h-[300px] overflow-y-auto">
                {fields.map((field) => (
                    <div
                        key={field.id}
                        className="relative flex items-center gap-2 bg-gray-50 rounded-md p-2 group hover:bg-gray-100"
                    >
                        <Handle
                            type="target"
                            id={`${field.id}-in`}
                            position={Position.Left}
                            style={{
                                top: '50%',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#3B82F6',
                                transform: 'translateY(-50%)'
                            }}
                        />

                        <input
                            className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="field"
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                        />

                        <div className="flex gap-1 text-xs font-semibold text-white">
                            {field.isPrimary && (
                                <span title="Primary" className="bg-blue-500 px-1 rounded">PK</span>
                            )}
                            {field.isForeign && (
                                <span className="bg-yellow-500 px-1 rounded">
                                    FK
                                </span>
                            )}
                            {field.relationType && (
                                <span className="bg-green-500 px-1 rounded">{field.relationType}</span>
                            )}
                        </div>

                        <select
                            value={field.type}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                        >
                            {fieldTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <div className="ml-auto flex items-center gap-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Settings2 className="w-4 h-4 text-gray-600" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="required"
                                                checked={field.isRequired}
                                                onCheckedChange={(val) => updateField(field.id, { isRequired: !!val })}
                                            />
                                            <Label htmlFor="required">Required</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="unique"
                                                checked={field.isUnique}
                                                onCheckedChange={(val) => updateField(field.id, { isUnique: !!val })}
                                            />
                                            <Label htmlFor="unique">Unique</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="primary"
                                                checked={field.isPrimary}
                                                onCheckedChange={(val) => updateField(field.id, { isPrimary: !!val })}
                                            />
                                            <Label htmlFor="primary">Primary Key</Label>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Trash2
                                className="w-4 h-4 text-gray-700 cursor-pointer opacity-0 group-hover:opacity-100 transition duration-150"
                                onClick={() => deleteField(field.id)}
                            />
                        </div>

                        <Handle
                            type="source"
                            id={`${field.id}-out`}
                            position={Position.Right}
                            style={{
                                top: '50%',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#3B82F6',
                                transform: 'translateY(-50%)'
                            }}
                        />
                    </div>

                ))}
            </div>

            <div className="px-3 py-2">
                <Button
                    variant="ghost"
                    onClick={addField}
                    className="w-full text-left font-medium text-sm flex items-center gap-2 text-gray-500 bg-gray-50 hover:bg-gray-200"
                >
                    <Plus className="w-4 h-4" />
                    Add Field
                </Button>
            </div>
        </div>
    );
};
