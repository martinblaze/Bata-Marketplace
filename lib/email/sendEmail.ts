// lib/email/sendEmail.ts
// Server-side only — never import this in client components

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

interface EmailPayload {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailPayload) {
  if (!resend) {
    console.log('📧 [DEV] Email skipped — no RESEND_API_KEY')
    console.log('   To:', to)
    console.log('   Subject:', subject)
    return
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
    }
  } catch (error) {
    console.error('Send email error:', error)
  }
}