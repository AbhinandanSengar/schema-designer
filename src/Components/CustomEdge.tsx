import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { RelationshipType } from '@/lib/types';

export function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    markerEnd
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY
    });

    const handleLabelClick = () => {
        window.dispatchEvent(
            new CustomEvent('edit-relationship', {
                detail: { edgeId: id }
            })
        );
    };

    const relationship = (data?.relationship as RelationshipType) || '1:1';

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all'
                    }}
                >
                    <div
                        onClick={handleLabelClick}
                        style={{
                            background: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            border: '1px solid #ccc'
                        }}
                    >
                        {relationship}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
