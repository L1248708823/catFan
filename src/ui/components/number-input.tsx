import { Input } from "@/ui/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/components/ui/input-group";
import { cn } from "@/ui/lib/utils";

export interface NumberInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** 单位文本，放在输入框右侧。例如 kg、kcal/kg、g。 */
  unit?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean | undefined;
}

/**
 * 数字输入。内部始终保存原始文本，解析交给调用方，
 * 这样输入 "3." 这类中间状态不会被强行改写成 3。
 */
export function NumberInput({
  id,
  value,
  onValueChange,
  unit,
  placeholder,
  inputMode = "decimal",
  disabled,
  className,
  ...rest
}: NumberInputProps) {
  if (!unit) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className={cn("numeric", className)}
        {...rest}
      />
    );
  }

  return (
    <InputGroup className={className}>
      <InputGroupInput
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className="numeric"
        {...rest}
      />
      <InputGroupAddon align="inline-end">
        <span className="text-xs text-muted-foreground">{unit}</span>
      </InputGroupAddon>
    </InputGroup>
  );
}
