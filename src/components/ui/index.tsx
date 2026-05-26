'use client'

// components/ui/index.tsx
// Componentes UI base — todos client-safe, sem dependências de servidor.


import { cn } from '@/lib/utils'
import type { ConditionStatus } from '@/types'

// ─── Button ─────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700 disabled:bg-neutral-300 disabled:text-neutral-500',
    secondary: 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100',
    ghost:     'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200',
    danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-700',
  }
  const sizes = {
    sm: 'h-8  px-3 text-xs  rounded-lg  gap-1.5',
    md: 'h-11 px-5 text-sm  rounded-xl  gap-2',
    lg: 'h-13 px-6 text-base rounded-2xl gap-2',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

// ─── ConditionBadge ─────────────────────────────────────

const BADGE_STYLES: Record<ConditionStatus, string> = {
  good: 'bg-good-bg text-good-text',
  ok:   'bg-ok-bg   text-ok-text',
  bad:  'bg-bad-bg  text-bad-text',
}
const DOT_STYLES: Record<ConditionStatus, string> = {
  good: 'bg-good',
  ok:   'bg-ok',
  bad:  'bg-bad',
}
const LABELS: Record<ConditionStatus, string> = {
  good: 'Bom',
  ok:   'Ok',
  bad:  'Mau',
}

export function ConditionBadge({
  status,
  className,
}: {
  status: ConditionStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        BADGE_STYLES[status],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_STYLES[status])} />
      {LABELS[status]}
    </span>
  )
}

// ─── Tag ────────────────────────────────────────────────

export function Tag({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium',
        className
      )}
    >
      {children}
    </span>
  )
}

// ─── Skeleton ───────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function SpotCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-neutral-100">
      <Skeleton className="w-2 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-6 w-10 rounded-full" />
    </div>
  )
}

// ─── EmptyState ─────────────────────────────────────────

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon = '🗺',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <span className="text-4xl" role="img">{icon}</span>
      <div>
        <p className="font-semibold text-neutral-700">{title}</p>
        {description && (
          <p className="text-sm text-neutral-400 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

// ─── Input ──────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export function Input({ label, error, icon, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-neutral-500 uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={cn(
            'w-full h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-xl',
            'text-sm text-neutral-900 placeholder:text-neutral-400',
            'focus:outline-none focus:border-brand-600 focus:bg-white transition-colors',
            error && 'border-red-400 bg-red-50',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

// ─── WeatherStat ─────────────────────────────────────────

export function WeatherStat({
  icon,
  value,
  label,
}: {
  icon: string
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-neutral-50 rounded-xl p-3 text-center">
      <span className="text-xl" role="img">{icon}</span>
      <span className="text-sm font-bold text-neutral-800">{value}</span>
      <span className="text-[10px] text-neutral-500 leading-tight">{label}</span>
    </div>
  )
}

// ─── LoginNudge ─────────────────────────────────────────

export function LoginNudge({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-brand-800">
          ✨ Inicia sessão para mais
        </p>
        <p className="text-xs text-brand-700 mt-0.5 leading-relaxed">
          Vê fotos da comunidade, adiciona notas, guarda favoritos e partilha o teu beta.
        </p>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={onLogin}
        className="self-start"
      >
        Iniciar sessão
      </Button>
    </div>
  )
}

// ─── OfflineBanner ──────────────────────────────────────

export function OfflineBanner() {
  return (
    <div
      className="w-full bg-neutral-800 text-white text-xs text-center py-2 px-4 z-50"
      role="status"
      aria-live="polite"
    >
      📡 Sem ligação à internet — a mostrar dados guardados
    </div>
  )
}
