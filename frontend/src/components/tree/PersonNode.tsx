import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../types';

function PersonNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const fullName = `${nodeData.first_name} ${nodeData.last_name}`;
  const birthYear = nodeData.birth_date ? new Date(nodeData.birth_date).getFullYear() : null;

  return (
    <div
      className="flex items-center gap-2 bg-white rounded-lg shadow-sm"
      style={{
        width: 160,
        height: 80,
        border: selected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '8px 10px',
        boxSizing: 'border-box',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />

      {/* Avatar */}
      <div className="flex-shrink-0">
        {nodeData.avatar_thumb_url ? (
          <img
            src={nodeData.avatar_thumb_url}
            alt={fullName}
            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ width: 26, height: 26, color: '#94a3b8' }}
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            marginBottom: 2,
          }}
        >
          {nodeData.last_name}
          {'\n'}
          {nodeData.first_name}
          {nodeData.patronymic ? ` ${nodeData.patronymic}` : ''}
        </p>
        {birthYear && (
          <p style={{ fontSize: 10, color: '#94a3b8' }}>{birthYear}</p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(PersonNode);
