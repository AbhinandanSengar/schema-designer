import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useReactFlow } from '@xyflow/react';
import type { RelationshipType, TableNodeData } from '@/lib/types';

type Props = {
    open: boolean;
    edgeId: string | null;
    onClose: () => void;
    onSelect?: (type: RelationshipType) => void; // Optional, for flexibility
};

const relationshipOptions: RelationshipType[] = ['1:1', '1:N', 'N:N'];

export function RelationshipModal({ open, edgeId, onClose, onSelect }: Props) {
    const [selected, setSelected] = useState<RelationshipType>('1:1');
    const { setEdges, getEdges, setNodes, getNodes } = useReactFlow();

    // Prefill current relationship on open
    useEffect(() => {
        if (!edgeId) return;

        const edge = getEdges().find((e) => e.id === edgeId);
        if (edge && edge.data && typeof edge.data === 'object' && 'relationship' in edge.data) {
            setSelected(edge.data.relationship as RelationshipType);
        }
    }, [edgeId, getEdges]);

    const handleSave = () => {
        if (!edgeId) return;

        // Update edge's relationship label
        setEdges((edges) =>
            edges.map((edge) =>
                edge.id === edgeId
                    ? {
                        ...edge,
                        data: {
                            ...(edge.data || {}),
                            relationship: selected,
                        },
                    }
                    : edge
            )
        );

        // Update target field in node
        const edge = getEdges().find((e) => e.id === edgeId);
        if (
            !edge ||
            !edge.source ||
            !edge.target ||
            !edge.sourceHandle ||
            !edge.targetHandle
        )
            return;

        const sourceFieldId = edge.sourceHandle.replace('-out', '');
        const targetFieldId = edge.targetHandle.replace('-in', '');

        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id !== edge.target) return node;

                const nodeData = node.data as TableNodeData;

                const updatedFields = nodeData.fields.map((field) =>
                    field.id === targetFieldId
                        ? {
                            ...field,
                            isForeign: true,
                            relationType: selected,
                            foreignRef: {
                                nodeId: edge.source,
                                fieldId: sourceFieldId,
                            },
                        }
                        : field
                );

                return {
                    ...node,
                    data: {
                        ...node.data,
                        fields: updatedFields,
                    },
                };
            })
        );

        // Optionally notify Canvas
        onSelect?.(selected);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="space-y-4">
                <DialogHeader>
                    <DialogTitle>Select Relationship Type</DialogTitle>
                </DialogHeader>

                <div className="flex justify-around items-center gap-4">
                    {relationshipOptions.map((option) => (
                        <Button
                            key={option}
                            variant={selected === option ? 'default' : 'outline'}
                            onClick={() => setSelected(option)}
                        >
                            {option}
                        </Button>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
