interface LoadingSkeletonProps {
  height?: number | string;
  width?: number | string;
  count?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const LoadingSkeleton = ({
  height = 20,
  width = '100%',
  count = 1,
  className = '',
  style,
}: LoadingSkeletonProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`skeleton ${className}`}
          style={{
            height,
            width,
            ...style,
          }}
        />
      ))}
    </div>
  );
};
