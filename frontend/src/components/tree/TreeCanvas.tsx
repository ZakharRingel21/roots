import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MiniMap,
  type Node,
  type Edge,
  type OnConnect,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import PersonNode from './PersonNode';
import type { FlowNodeData, FlowEdgeData } from '../../types';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

function getLayoutedElements(
  nodes: Node<FlowNodeData>[],
  edges: Edge<FlowEdgeData>[]
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

const nodeTypes = {
  personNode: PersonNode,
};

interface TreeCanvasProps {
  nodes: Node<FlowNodeData>[];
  edges: Edge<FlowEdgeData>[];
  onNodeClick: (event: React.MouseEvent, node: Node<FlowNodeData>) => void;
  treeId: string;
}

export default function TreeCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
}: TreeCanvasProps) {
  const styledEdges = useMemo(
    () =>
      initialEdges.map((edge) => {
        const isSpouse = edge.data?.relationship_type === 'spouse';
        return {
          ...edge,
          type: 'smoothstep',
          animated: !isSpouse,
          style: isSpouse
            ? { strokeDasharray: '5 5', stroke: '#f59e0b', strokeWidth: 2 }
            : { stroke: '#6366f1', strokeWidth: 1.5 },
          markerEnd: isSpouse
            ? undefined
            : {
                type: MarkerType.ArrowClosed,
                color: '#6366f1',
              },
        };
      }),
    [initialEdges]
  );

  const typedNodes = useMemo(
    () =>
      initialNodes.map((n) => ({
        ...n,
        type: 'personNode',
      })),
    [initialNodes]
  );

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(typedNodes, styledEdges as Edge<FlowEdgeData>[]),
    [typedNodes, styledEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(
      typedNodes,
      styledEdges as Edge<FlowEdgeData>[]
    );
    setNodes(ln);
    setEdges(le);
  }, [typedNodes, styledEdges, setNodes, setEdges]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick as (event: React.MouseEvent, node: Node) => void}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <MiniMap
          nodeColor={() => '#6366f1'}
          maskColor="rgba(241,245,249,0.7)"
          style={{ borderRadius: 8 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
      </ReactFlow>

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 bg-white border border-slate-200 rounded-md p-1.5 shadow-sm hover:bg-slate-50 transition-colors"
        aria-label={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
        title={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
      >
        {isFullscreen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
