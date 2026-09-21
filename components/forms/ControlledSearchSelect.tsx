import { Control, Controller, FieldValues, Path, PathValue } from 'react-hook-form';
import FancyErrorText from './FancyErrorText';
import FancySearchSelect, { FancySearchSelectProps } from '../fields/FancySearchSelect';
import { View } from 'react-native';

interface ControlledSearchSelectProps<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues>,
> extends Pick<
  FancySearchSelectProps<PathValue<TFormValues, TName>>,
  | 'placeholder'
  | 'listItems'
  | 'label'
  | 'onChange'
  | 'disabled'
  | 'isLoading'
  | 'title'
  | 'searchPlaceholder'
  | 'loadingMessage'
  | 'errorMessage'
  | 'onRetry'
  | 'retryLabel'
  | 'labelProps'
  | 'onClosed'
  | 'multiSelect'
> {
  control: Control<TFormValues>;
  name: TName;
}

export default function ControlledSearchSelect<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues>,
>({ control, name, ...rest }: ControlledSearchSelectProps<TFormValues, TName>) {
  const { listItems, onChange: externalOnChange, ...selectProps } = rest;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value, disabled }, fieldState: { error } }) => (
        <View style={{ gap: 5 }}>
          <FancySearchSelect<PathValue<TFormValues, TName>>
            listItems={listItems}
            value={value as PathValue<TFormValues, TName>}
            onBlur={onBlur}
            onChange={(selectedValue) => {
              onChange(selectedValue);
              externalOnChange?.(selectedValue);
            }}
            disabled={disabled}
            {...selectProps}
          />
          {error && <FancyErrorText message={error.message!} />}
        </View>
      )}
    />
  );
}
