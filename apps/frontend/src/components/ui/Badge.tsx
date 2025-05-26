const variants = {
  default: 'bg-muted text-foreground',
  accent: 'bg-accent text-white',
  positive: 'bg-positive text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-black',
  danger: 'bg-red-500 text-white',
  secondary: 'bg-neutral text-white',
  outline: 'border border-muted text-foreground',
}

export const Badge = ({ children, variant = 'default', className = '' }: {
  children: React.ReactNode,
  variant?: keyof typeof variants,
  className?: string
}) => {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-xl inline-flex items-center ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
