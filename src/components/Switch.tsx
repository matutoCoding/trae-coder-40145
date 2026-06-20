interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch = ({ checked, onChange, label, disabled = false }: SwitchProps) => {
  return (
    <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-primary-500' : 'bg-gray-300'
        }`}
        onClick={() => !disabled && onChange(!checked)}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};
