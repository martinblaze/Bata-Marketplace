// lib/auth/adminLogout.ts
// Call this function whenever you want to log out of admin
// e.g: import { adminLogout } from '@/lib/auth/adminLogout'
//      <button onClick={adminLogout}>Logout</button>

import { useRouter } from 'next/navigation'

export function adminLogout() {
  // Clear cookie
  document.cookie = 'adminToken=; path=/; max-age=0; SameSite=Strict'
  
  // Clear localStorage
  localStorage.removeItem('adminToken')
  
  // Redirect to login
  window.location.href = '/admin-login'
}