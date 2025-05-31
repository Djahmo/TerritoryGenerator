type SeparatorXProps = {
  className?: string;
};

const SeparatorX = ({ className = '' }: SeparatorXProps) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-full border-t border-muted/50" />
    </div>
  );
};

export default SeparatorX;
