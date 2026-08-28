export interface ConfigValue<T> {
  value: T;
  status: 'confirmed' | 'candidate';
}

export function confirmed<T>(value: T): ConfigValue<T> {
  return { value, status: 'confirmed' };
}

export function candidate<T>(value: T): ConfigValue<T> {
  return { value, status: 'candidate' };
}
