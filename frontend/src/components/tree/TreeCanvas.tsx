import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MiniMap,
  Panel,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PersonNode      from './PersonNode';
import ParentChildEdge from './ParentChildEdge';
import SpouseEdge      from './SpouseEdge';
import { computeLayout, NODE_WIDTH, NODE_HEIGHT } from './layoutEngine';
import type { FlowNodeData, FlowEdgeData } from '../../types';

const nodeTypes = { personNode: PersonNode };
const edgeTypes = { parentChildEdge: ParentChildEdge, spouseEdge: SpouseEdge };

interface TreeCanvasProps {
  nodes: Node<FlowNodeData>[];
  edges: Edge<FlowEdgeData>[];
  onNodeClick: (event: React.MouseEvent, node: Node<FlowNodeData>) => void;
  treeId: string;
}

function buildGraph(
  rawNodes: Node<FlowNodeData>[],
  rawEdges: Edge<FlowEdgeData>[],
) {
  const positions = computeLayout(
    rawNodes.map(n => ({ id: n.id, data: n.data })),
    rawEdges.map(e => ({ id: e.id, source: e.source, target: e.target, data: e.data as any })),
  );

  const nodes = rawNodes.map(n => ({
    ...n,
    type: 'personNode',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
  }));

  // Build spouse lookup: personId → spouseId
  const spouseOf = new Map<string, string>();
  for (const e of rawEdges) {
    if ((e.data as FlowEdgeData)?.relationship_type === 'spouse') {
      spouseOf.set(e.source, e.target);
      spouseOf.set(e.target, e.source);
    }
  }

  const edges: Edge[] = rawEdges.map(e => {
    const relType = (e.data as FlowEdgeData)?.relationship_type;

    if (relType === 'parent') {
      return {
        ...e,
        type: 'parentChildEdge',
        sourceHandle: 'bottom',
        targetHandle: 'top',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        data: { ...(e.data as object), spouseId: spouseOf.get(e.source) },
      };
    }

    if (relType === 'spouse' || relType === 'sibling') {
      const posA = positions.get(e.source);
      const posB = positions.get(e.target);
      const aIsLeft = !posA || !posB || posA.x <= posB.x;
      return {
        ...e,
        type: 'spouseEdge',
        sourceHandle: aIsLeft ? 'right-s' : 'left-s',
        targetHandle: aIsLeft ? 'left-t'  : 'right-t',
        data: { ...(e.data as object), style: relType === 'sibling' ? 'sibling' : undefined },
      };
    }

    return e;
  });

  return { nodes, edges };
}

function AutoLayoutButton({ onLayout }: { onLayout: () => void }) {
  const { fitView } = useReactFlow();
  return (
    <button
      onClick={() => { onLayout(); setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50); }}
      className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
      title="Авторасположение"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      Авторасположение
    </button>
  );
}

export default function TreeCanvas({ nodes: rawNodes, edges: rawEdges, onNodeClick }: TreeCanvasProps) {
  const initial = buildGraph(rawNodes, rawEdges);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(rawNodes, rawEdges);
    setNodes(n);
    setEdges(e);
  }, [rawNodes, rawEdges, setNodes, setEdges]);

  const handleAutoLayout = useCallback(() => {
    const { nodes: n, edges: e } = buildGraph(rawNodes, rawEdges);
    setNodes(n);
    setEdges(e);
  }, [rawNodes, rawEdges, setNodes, setEdges]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  return (
    <div className="w-full h-full relative" style={{ background: '#f7f9fc' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick as (event: React.MouseEvent, node: Node) => void}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap nodeColor={() => '#6366f1'} maskColor="rgba(241,245,249,0.7)" style={{ borderRadius: 8 }} />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#c8d5e8" />
        <Panel position="top-left">
          <AutoLayoutButton onLayout={handleAutoLayout} />
        </Panel>
      </ReactFlow>

      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 bg-white border border-slate-200 rounded-md p-1.5 shadow-sm hover:bg-slate-50 transition-colors"
        title={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </button>
    </div>
  );
}
