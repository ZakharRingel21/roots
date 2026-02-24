import React from 'react';

interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 200,
};

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
  xl: 'text-4xl',
};

export default function Avatar({ url, name, size = 'md', className = '' }: AvatarProps) {
  const px = sizeMap[size];
  const textSize = textSizeMap[size];

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Аватар'}
        width={px}
        height={px}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div
      className={`rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      {initials ? (
        <span className={`${textSize} font-medium text-slate-600`}>{initials}</span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-slate-400"
          style={{ width: px * 0.55, height: px * 0.55 }}
        >
          <path
            fillRule="evenodd"
            d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}
