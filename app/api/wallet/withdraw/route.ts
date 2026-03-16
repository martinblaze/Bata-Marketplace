// app/api/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function hashFaceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, bankCode, accountNumber, accountName, faceToken } = await request.json()

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 })
    }
    if (!accountNumber || !bankCode || !accountName) {
      return NextResponse.json({ error: 'Bank details required' }, { status: 400 })
    }
    if (amount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal is ₦1,000' }, { status: 400 })
    }

    // ── Fetch fresh user data including face token fields ─────────────────────
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        availableBalance: true,
        faceDescriptor: true,
        faceToken: true,
        faceTokenExpiry: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ── Face ID must be registered ────────────────────────────────────────────
    if (!currentUser.faceDescriptor) {
      return NextResponse.json(
        {
          error: 'FACE_ID_REQUIRED',
          message: 'You must register your Face ID before you can withdraw funds.',
        },
        { status: 403 }
      )
    }

    // ── faceToken must be present in the request body ─────────────────────────
    if (!faceToken || typeof faceToken !== 'string') {
      return NextResponse.json(
        {
          error: 'FACE_VERIFICATION_REQUIRED',
          message: 'Face verification is required before withdrawing.',
        },
        { status: 403 }
      )
    }

    // ── Validate faceToken against DB ─────────────────────────────────────────
    const hashedIncoming = hashFaceToken(faceToken)
    const now = new Date()

    const tokenMissing = !currentUser.faceToken || !currentUser.faceTokenExpiry
    const tokenExpired = currentUser.faceTokenExpiry !== null && currentUser.faceTokenExpiry < now
    const tokenMismatch = currentUser.faceToken !== hashedIncoming

    if (tokenMissing || tokenExpired || tokenMismatch) {
      // Always clear whatever is in DB on any failure — force a fresh face scan
      await prisma.user.update({
        where: { id: user.id },
        data: { faceToken: null, faceTokenExpiry: null },
      })
      return NextResponse.json(
        {
          error: 'FACE_VERIFICATION_REQUIRED',
          message: tokenExpired
            ? 'Your face verification has expired. Please verify your face again.'
            : 'Face verification failed. Please verify your face and try again.',
        },
        { status: 403 }
      )
    }

    // ✅ Token is valid — immediately invalidate it (single-use)
    // This prevents replay even within the 2-minute window
    await prisma.user.update({
      where: { id: user.id },
      data: { faceToken: null, faceTokenExpiry: null },
    })

    // ── Balance check ─────────────────────────────────────────────────────────
    if (currentUser.availableBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₦${currentUser.availableBalance.toLocaleString()}` },
        { status: 400 }
      )
    }

    // ── Development: mock withdrawal ──────────────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      const reference = `WD-DEV-${Date.now()}`

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { availableBalance: { decrement: amount } },
        })
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'WITHDRAWAL',
            amount,
            description: `Withdrawal to ${accountName} (${accountNumber}) - DEV MODE`,
            reference,
            balanceBefore: currentUser.availableBalance,
            balanceAfter: currentUser.availableBalance - amount,
          },
        })
      }, { timeout: 15000, maxWait: 20000 })

      return NextResponse.json({ success: true, message: 'Withdrawal successful (Dev Mode)', reference })
    }

    // ── Production: Paystack Transfer API ─────────────────────────────────────
    const transferReference = `WD-${Date.now()}-${user.id.substring(0, 8)}`

    // Step 1: Create transfer recipient
    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    })
    const recipientData = await recipientResponse.json()
    if (!recipientData.status) {
      return NextResponse.json(
        { error: recipientData.message || 'Failed to create recipient' },
        { status: 400 }
      )
    }

    // Step 2: Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100,
        recipient: recipientData.data.recipient_code,
        reason: `BATAMART withdrawal - ${accountName}`,
        reference: transferReference,
      }),
    })
    const transferData = await transferResponse.json()
    if (!transferData.status) {
      return NextResponse.json(
        { error: transferData.message || 'Transfer failed' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { availableBalance: { decrement: amount } },
      })
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'WITHDRAWAL',
          amount,
          description: `Withdrawal to ${accountName} (${accountNumber})`,
          reference: transferReference,
          balanceBefore: currentUser.availableBalance,
          balanceAfter: currentUser.availableBalance - amount,
        },
      })
    }, { timeout: 15000, maxWait: 20000 })

    return NextResponse.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      reference: transferReference,
      transferCode: transferData.data.transfer_code,
    })
  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: 'Failed to process withdrawal' }, { status: 500 })
  }
}