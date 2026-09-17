import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  disabled?: boolean;
}

/** Password input with an accessible show/hide toggle. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  autoComplete,
  disabled,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required>
      <div className="input-wrap">
        <Input
          id={id}
          type={show ? "text" : "password"}
          className="input-pw"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          invalid={!!error}
          disabled={disabled}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          tabIndex={-1}
          disabled={disabled}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
}
