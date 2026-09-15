export default function Button({ 
  children, 
  onClick, 
  variant = "primary", 
  className = "",
  ...props 
}) {
  const baseStyles = "px-4 py-2 rounded font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-cyan-600 hover:bg-cyan-700 text-white",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
    outline: "border border-cyan-600 text-cyan-400 hover:bg-cyan-950",
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}