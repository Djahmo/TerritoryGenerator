import { LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes, useState } from "react";
import { BadgeAlert, BadgeCheck, Eye, EyeClosed } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InputProps {
  label?: string;
  name?: string;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
  type: string;
  value: string;
  className?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onWheel?: (e: React.WheelEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autocomplete?: string;
  verified?: boolean;
  Icon?: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
}

const Input = ({ label, name, placeholder, className, min, max, step, type, value, onChange, onBlur, onWheel, disabled, autocomplete, verified, Icon }: InputProps) => {

  const { t } = useTranslation();

  const [showPassword, setShowPassword] = useState(false);

  let conditions: { regex: RegExp; message: string }[] = [];
  if (verified) {
    switch (type) {
      case "email":
        conditions = [
          {
            regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            message: t("common.inputCondition.email"),
          },
        ];
        break;
      case "username":
        conditions = [
          {
            regex: /^[a-zA-Z0-9._-]{3,}$/,
            message: t("common.inputCondition.username"),
          },
        ];
        break;
      case "password":
        conditions = [
          {
            regex: /^.{8,20}$/,
            message: t('common.inputCondition.password.length'),
          },
          {
            regex: /[a-z]/,
            message: t('common.inputCondition.password.lowercase'),
          },
          {
            regex: /[A-Z]/,
            message: t('common.inputCondition.password.uppercase'),
          },
          {
            regex: /[\d]/,
            message: t('common.inputCondition.password.number'),
          },
          {
            regex: /[^a-zA-Z0-9]/,
            message: t('common.inputCondition.password.special'),
          },
        ];
        break;

      default:
        conditions = [];
        break;
    }
  }

  const [visibleCondition, setVisibleCondition] = useState(false);

  const handleFocus = () => {
    setVisibleCondition(true);
  }
  const handleBlur = () => {
    onBlur?.()
    if (type !== "password" || !verified)
      setVisibleCondition(false);
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="mb-2 text-sm font-medium">{label}</label>}
      <div className={`border-b relative ${conditions.length > 0 && "mb-2"} ${visibleCondition ? " border-positive" : "border-positive/50"} `}>
        {!!Icon && <Icon size={20} className="absolute ml-2 mt-2 text-positive" />}
        <input
          type={showPassword ? "text" : type}
          name={name}
          placeholder={!visibleCondition ? placeholder : ''}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={onChange}
          onWheel={onWheel}
          disabled={disabled}
          autoComplete={autocomplete}
          className={"w-full p-2 pb-1 outline-0" + (Icon ? " pl-10" : "")}
          min={type === "number" ? min : undefined}
          max={type === "number" ? max : undefined}
          step={type === "number" ? step : undefined}
        />
        {type === "password" && (
          <button
            type="button"
            className="absolute right-2 top-2 text-positive cursor-pointer"
            onClick={() => setShowPassword(prev => !prev)}
          >
            {!showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {visibleCondition && verified && conditions.map((condition, index) => (
        <VerifiedCondition
          key={index}
          regex={condition.regex}
          message={condition.message}
          value={value}
          verified={!!verified}
        />
      ))}
    </div>
  );
}

interface VerifiedConditionProps {
  regex: RegExp;
  message: string;
  value: string;
  verified: boolean;
}
const VerifiedCondition = ({ regex, message, value, verified }: VerifiedConditionProps) => {

  const valid = regex.test(value);

  const messageClass = valid ? "text-success" : "text-error"

  return (
    <div className={`flex items-center gap-2 ml-2 ${!verified && 'hidden'} ${messageClass}`}>
      {valid ? <BadgeCheck size={20} /> : <BadgeAlert size={20} />}
      <span className="ml-1">{message}</span>
    </div>
  );
}


export default Input;
