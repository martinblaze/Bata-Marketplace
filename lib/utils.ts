import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount)
}

// Format phone number
export function formatPhone(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Format as Nigerian number
  if (digits.startsWith('234')) {
    return `+${digits}`
  } else if (digits.startsWith('0')) {
    return `+234${digits.slice(1)}`
  }
  return `+234${digits}`
}

// Generate unique order number
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `TRD${timestamp}${random}`.toUpperCase()
}

// Calculate delivery fee based on distance/hostel
export function calculateDeliveryFee(hostel: string): number {
  // Simple fee structure - can be expanded
  const baseFee = 500
  
  // You can add hostel-specific pricing here
  const hostelFees: Record<string, number> = {
    'Zik Lodge': 500,
    'Hilltop': 700,
    'Temp Site': 1000,
    // Add more hostels
  }
  
  return hostelFees[hostel] || baseFee
}

// Calculate platform commission (10%)
export function calculateCommission(amount: number): number {
  return amount * 0.1
}

// Update trust level based on completed orders
export function calculateTrustLevel(completedOrders: number): string {
  if (completedOrders >= 20) return 'GOLD'
  if (completedOrders >= 6) return 'SILVER'
  return 'BRONZE'
}

// Format date
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatDate(date)
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

// Validate Nigerian phone number
export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return /^(0|234)[789]\d{9}$/.test(cleaned)
}

// Validate email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Sleep utility for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
