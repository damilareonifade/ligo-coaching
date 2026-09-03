import { createContext, useContext, type ReactNode } from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { View } from 'react-native';

import { LIInput, LIText, type LIInputProps } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface LIFormProps<TValues extends FieldValues> {
  readonly form: UseFormReturn<TValues>;
  readonly children: ReactNode;
  readonly className?: string;
}

export function LIForm<TValues extends FieldValues>({
  form,
  children,
  className,
}: LIFormProps<TValues>) {
  return (
    <FormProvider {...form}>
      <View className={cn('gap-4', className)}>{children}</View>
    </FormProvider>
  );
}

/** Which field the surrounding LIFormItem describes — read by label/message. */
const FieldNameContext = createContext<string | null>(null);

function useFieldName(): string {
  const name = useContext(FieldNameContext);
  if (name === null) {
    throw new Error('LIFormLabel/LIFormMessage must be rendered inside an LIFormItem.');
  }
  return name;
}

export interface LIFormItemProps {
  readonly name: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function LIFormItem({ name, children, className }: LIFormItemProps) {
  return (
    <FieldNameContext.Provider value={name}>
      <View className={cn('gap-1.5', className)}>{children}</View>
    </FieldNameContext.Provider>
  );
}

export function LIFormLabel({
  text,
  className,
}: {
  readonly text: string;
  readonly className?: string;
}) {
  return <LIText size="caption" color="primary" text={text} className={cn('font-semibold', className)} />;
}

export function LIFormDescription({ text }: { readonly text: string }) {
  return <LIText size="caption" color="muted" text={text} />;
}

export function LIFormMessage() {
  const name = useFieldName();
  const {
    formState: { errors },
  } = useFormContext();
  const error = errors[name];
  const message = typeof error?.message === 'string' ? error.message : null;

  if (!message) return null;
  return <LIText size="caption" color="danger" text={message} />;
}

export interface LIFormFieldProps<TValues extends FieldValues> {
  readonly name: FieldPath<TValues>;
  readonly label?: string;
  readonly labelClassName?: string;
  readonly description?: string;
  readonly render: (field: ControllerRenderProps<TValues>) => ReactNode;
}

/** Generic field: bring your own control via `render`. */
export function LIFormField<TValues extends FieldValues>({
  name,
  label,
  labelClassName,
  description,
  render,
}: LIFormFieldProps<TValues>) {
  const { control } = useFormContext<TValues>();

  return (
    <LIFormItem name={name}>
      {label ? <LIFormLabel text={label} className={labelClassName} /> : null}
      <Controller control={control} name={name} render={({ field }) => <>{render(field)}</>} />
      {description ? <LIFormDescription text={description} /> : null}
      <LIFormMessage />
    </LIFormItem>
  );
}

export interface LIFormInputProps<TValues extends FieldValues> {
  readonly name: FieldPath<TValues>;
  readonly label?: string;
  readonly labelClassName?: string;
  readonly placeholder?: string;
  readonly secureTextEntry?: boolean;
  readonly keyboardType?: 'default' | 'email-address' | 'numeric';
  readonly autoCapitalize?: 'none' | 'sentences' | 'words';
  readonly description?: string;
  readonly variant?: LIInputProps['variant'];
  readonly inputSize?: LIInputProps['inputSize'];
  readonly returnKeyType?: 'next' | 'done' | 'go';
  readonly onSubmitEditing?: () => void;
}

/** The common case: a text field bound to the form. */
export function LIFormInput<TValues extends FieldValues>({
  name,
  label,
  labelClassName,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  description,
  variant,
  inputSize,
  returnKeyType,
  onSubmitEditing,
}: LIFormInputProps<TValues>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<TValues>();
  const error = errors[name];
  const message = typeof error?.message === 'string' ? error.message : undefined;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <LIInput
          label={label}
          labelClassName={labelClassName}
          placeholder={placeholder}
          value={typeof field.value === 'string' ? field.value : ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          variant={variant}
          inputSize={inputSize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          error={message}
          hint={description}
        />
      )}
    />
  );
}
