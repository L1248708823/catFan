import { Field, FieldDescription, FieldError, FieldLabel } from "@/ui/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
}

/** 把领域层的 label 表转成下拉选项，避免每个页面各写一份。 */
export function toSelectOptions<T extends string>(labels: Record<T, string>): SelectOption[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  description?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean | undefined;
}

/** 带标签与错误提示的下拉字段。选项值必须是非空字符串。 */
export function SelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  description,
  error,
  placeholder,
  disabled,
}: SelectFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange} disabled={disabled ?? false}>
        <SelectTrigger id={id} aria-invalid={error ? true : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
