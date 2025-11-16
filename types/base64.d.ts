declare module 'base-64' {
  export function decode(input: string): string;
  export function encode(input: string): string;
  export { decode as atob, encode as btoa };
}
