import { motion } from 'motion/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <motion.div
        className={`${sizeClasses[size]} border-t-neon-cyan border-r-neon-cyan/40 border-b-neon-cyan/20 border-l-neon-cyan/10 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: 'linear',
        }}
      />
      {label && (
        <span className="text-sm font-medium tracking-wide text-gray-500 dark:text-gray-400 font-display animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}
