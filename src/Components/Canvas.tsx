import {
    addEdge,
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type Node,
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';

import { Button } from "./ui/button";
import { Code, FileJson, Plus, Redo2, Undo2, X } from "lucide-react";
import type { TableNodeData } from "@/lib/types";
import { nanoid } from "nanoid";
import { CustomNode } from "./CustomNode";
import { useEffect, useRef, useState, type SetStateAction } from "react";
import { CustomEdge } from "./CustomEdge";
import { RelationshipModal } from "./RelationshipModal";

type CanvasProps = {
    selectedProject: string;
    setSelectedProject: React.Dispatch<SetStateAction<string>>;
};

const nodeTypes = {
    'custom': CustomNode
};

const edgeTypes = {
    'custom-edge': CustomEdge
};

const initialNodes: Node<TableNodeData>[] = [];
const initialEdges: Edge[] = [];

const Canvas = ({ selectedProject, setSelectedProject }: CanvasProps) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [tempProjectName, setTempProjectName] = useState(selectedProject);
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

    const [generatedCode, setGeneratedCode] = useState("");
    const [showCodePanel, setShowCodePanel] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: CustomEvent) => {
            setEditingEdgeId(e.detail.edgeId);
        };
        window.addEventListener("edit-relationship", handler as EventListener);
        return () => window.removeEventListener("edit-relationship", handler as EventListener);
    }, []);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);

                // New format: { schema: [...], edges: [...] }
                if (!Array.isArray(json.schema) || !Array.isArray(json.edges)) {
                    throw new Error("Invalid schema format");
                }

                const importedNodes: Node<TableNodeData>[] = json.schema.map((table: any) => ({
                    id: table.id,
                    type: "custom",
                    position: table.position || { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
                    data: {
                        tableName: table.tableName,
                        fields: table.fields || [],
                        primaryKeys: table.primaryKeys || [],
                    },
                }));

                const importedEdges: Edge[] = json.edges.map((edge: any) => ({
                    id: edge.id || nanoid(),
                    type: edge.type || "custom-edge",
                    source: edge.source,
                    sourceHandle: edge.sourceHandle,
                    target: edge.target,
                    targetHandle: edge.targetHandle,
                    data: {
                        relationship: edge.data?.relationship || "1:1"
                    }
                }));

                setNodes(importedNodes);
                setEdges(importedEdges);
            } catch (err) {
                alert("Failed to import schema: " + (err as Error).message);
            }
        };

        reader.readAsText(file);
    };


    const onConnect = (params: Connection) => {
        const { source, target, sourceHandle, targetHandle } = params;
        if (!source && !target && !sourceHandle && !targetHandle) return;

        setEdges((eds) => addEdge({
            ...params,
            type: "custom-edge",
            data: { relationship: '1:1' }
        }, eds));

        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id !== target) return node;
                const updatedFields = node.data.fields.map((field) =>
                    `${field.id}-in` === targetHandle
                        ? {
                            ...field,
                            isForeign: true,
                            foreignRef: {
                                nodeId: source,
                                fieldId: sourceHandle!.replace("-out", ""),
                            },
                        }
                        : field
                );
                return {
                    ...node,
                    data: { ...node.data, fields: updatedFields }
                };
            })
        );
    };

    const addTable = () => {
        const newNode: Node<TableNodeData> = {
            id: nanoid(),
            type: "custom",
            position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
            data: {
                tableName: "New Table",
                fields: [],
            }
        };
        setNodes(prev => [...prev, newNode]);
    };

    const exportJSON = () => {
        const schema = nodes.map((node) => ({
            id: node.id,
            position: node.position,
            tableName: node.data.tableName,
            fields: node.data.fields.map((field) => ({
                id: field.id,
                name: field.name,
                type: field.type,
                isPrimary: field.isPrimary || false,
                isRequired: field.isRequired || false,
                isUnique: field.isUnique || false,
                isForeign: field.isForeign || false,
                foreignRef: field.foreignRef || null,
                relationType: field.relationType || null,
            })),
            primaryKeys: node.data.primaryKeys || [],
        }));

        const exportData = {
            schema,
            edges,
            version: "1.0.0",
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "schema.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const getTableNameById = (nodeId: string): string => {
        const table = nodes.find(n => n.id === nodeId);
        return table?.data?.tableName || 'UNKNOWN_TABLE';
    };

    const getFieldNameById = (ref: { nodeId: string, fieldId: string }): string => {
        const node = nodes.find(n => n.id === ref.nodeId);
        const field = node?.data.fields.find(f => f.id === ref.fieldId);
        return field?.name || 'UNKNOWN_FIELD';
    };

    const handleGenerateCode = () => {
        const code = nodes.map((node) => {
            const lines: string[] = [];
            const fkConstraints: string[] = [];

            node.data.fields.forEach((field) => {
                const parts = [`${field.name} ${field.type.toUpperCase()}`];

                if (field.isRequired) parts.push('NOT NULL');
                if (field.isUnique) parts.push('UNIQUE');

                // Remove inline PRIMARY KEY if composite will be added later
                lines.push('  ' + parts.join(' '));

                if (field.isForeign && field.foreignRef) {
                    fkConstraints.push(
                        `  FOREIGN KEY (${field.name}) REFERENCES ${getTableNameById(field.foreignRef.nodeId)}(${getFieldNameById(field.foreignRef)})`
                    );
                }
            });

            // Add composite key if more than 1 primary key
            if (node.data.primaryKeys && node.data.primaryKeys.length > 1) {
                const composite = node.data.primaryKeys
                    .map((fid) => node.data.fields.find(f => f.id === fid)?.name)
                    .filter(Boolean)
                    .join(', ');
                if (composite) lines.push(`  PRIMARY KEY (${composite})`);
            } else if (node.data.primaryKeys?.length === 1) {
                // Handle single primary key if only one field
                const fid = node.data.primaryKeys[0];
                const fname = node.data.fields.find(f => f.id === fid)?.name;
                if (fname) lines.push(`  PRIMARY KEY (${fname})`);
            }

            const allLines = [...lines, ...fkConstraints];
            return `CREATE TABLE ${node.data.tableName} (\n${allLines.join(',\n')}\n);`;
        }).join("\n\n");

        setGeneratedCode(code);
        setShowCodePanel(true);
    };

    return (
        <div className="flex h-[calc(100vh-56px)] overflow-hidden">
            <div className="flex flex-col flex-1 transition-all duration-300">
                <div className="flex justify-between items-center px-8 py-2 border-b border-gray-300 bg-white z-10">
                    <div className="flex items-center gap-3">
                        {isEditingProjectName ? (
                            <input
                                value={tempProjectName}
                                onChange={(e) => setTempProjectName(e.target.value)}
                                onBlur={() => {
                                    setSelectedProject(tempProjectName.trim() || "Untitled Project");
                                    setIsEditingProjectName(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        setSelectedProject(tempProjectName.trim() || "Untitled Project");
                                        setIsEditingProjectName(false);
                                    } else if (e.key === "Escape") {
                                        setTempProjectName(selectedProject);
                                        setIsEditingProjectName(false);
                                    }
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                        ) : (
                            <span
                                className="text-lg font-medium truncate max-w-[300px] cursor-pointer"
                                onClick={() => {
                                    setTempProjectName(selectedProject);
                                    setIsEditingProjectName(true);
                                }}
                            >
                                {selectedProject}
                            </span>
                        )}

                        <div className="flex items-center gap-1">
                            <Button variant="outline"><Undo2 /></Button>
                            <Button variant="outline"><Redo2 /></Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={addTable}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Table
                        </Button>

                        <Button variant="outline" onClick={handleImportClick}>
                            <FileJson className="w-4 h-4 mr-1" />
                            Import JSON
                        </Button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                        />

                        <Button variant="outline" onClick={exportJSON}>
                            <FileJson className="w-4 h-4 mr-1" />
                            Export JSON
                        </Button>

                        <Button onClick={handleGenerateCode}>
                            <Code className="w-4 h-4 mr-1" />
                            Generate Code
                        </Button>
                    </div>
                </div>

                <div className="flex-1">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        snapToGrid
                        snapGrid={[20, 20]}
                        zoomOnDoubleClick={false}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                    >
                        <MiniMap />
                        <Controls />
                        <Background />
                    </ReactFlow>
                </div>
            </div>

            {showCodePanel && (
                <div className="w-[40%] max-w-[600px] border-l border-gray-300 bg-gray-50 p-4 overflow-auto">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-md font-semibold">Generated Code</h2>
                        <Button variant="ghost" size="icon" onClick={() => setShowCodePanel(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <pre className="bg-white p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                        <code>{generatedCode}</code>
                    </pre>
                </div>
            )}

            {editingEdgeId && (
                <RelationshipModal
                    open={true}
                    edgeId={editingEdgeId}
                    onClose={() => setEditingEdgeId(null)}
                    onSelect={(type) => {
                        setEdges((edges) =>
                            edges.map((edge) =>
                                edge.id === editingEdgeId
                                    ? { ...edge, data: { ...edge.data, relationship: type } }
                                    : edge
                            )
                        );
                        setEditingEdgeId(null);
                    }}
                />
            )}
        </div>
    );
};

export default Canvas;
