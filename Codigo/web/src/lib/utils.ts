import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const number = (value: number | null | undefined, digits = 1) => value == null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const time = (value: number) => new Date(value).toLocaleTimeString('pt-BR');
