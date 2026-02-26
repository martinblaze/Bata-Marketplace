// app/api/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, bankCode, accountNumber, accountName } = await request.json()

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 })
    }
    if (!accountNumber || !bankCode || !accountName) {
      return NextResponse.json({ error: 'Bank details required' }, { status: 400 })
    }
    if (amount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal is ₦1,000' }, { status: 400 })
    }

    // Get fresh user data (getUserFromRequest selects faceDescriptor now,
    // but we do a fresh fetch here to also get availableBalance)
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ✅ Face ID check — must be registered before any withdrawal
    if (!currentUser.faceDescriptor) {
      return NextResponse.json(
        {
          error: 'FACE_ID_REQUIRED',
          message: 'You must register your Face ID before you can withdraw funds.',
        },
        { status: 403 }
      )
    }

    // Balance check
    if (currentUser.availableBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₦${currentUser.availableBalance.toLocaleString()}` },
        { status: 400 }
      )
    }

    // ── Development: mock withdrawal ─────────────────────────────────────────
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

    // ── Production: Paystack Transfer API ────────────────────────────────────
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
        amount: amount * 100, // kobo
        recipient: recipientData.data.recipient_code,
        reason: `BATA withdrawal - ${accountName}`,
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