import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { OrderStatus } from '@prisma/client';

// Helper function to get user from JWT token
async function getUserFromToken(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Get user from JWT token instead of session
    const user = await getUserFromToken(req);

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                profilePhoto: true,
                avgRating: true,
                totalReviews: true,
                trustLevel: true,
                completedOrders: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            email: true,
            avgRating: true,
            totalReviews: true,
            trustLevel: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            profilePhoto: true,
            email: true,
            avgRating: true,
            totalReviews: true,
            trustLevel: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                profilePhoto: true,
              },
            },
          },
        },
        productReviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user is authorized to view this order
    const isBuyer = order.buyerId === user.id;
    const isSeller = order.sellerId === user.id;
    const isRider = order.riderId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isBuyer && !isSeller && !isRider && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Get user from JWT token instead of session
    const user = await getUserFromToken(req);

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        buyer: true,
        seller: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    const isBuyer = existingOrder.buyerId === user.id;
    const isSeller = existingOrder.sellerId === user.id;
    const isRider = existingOrder.riderId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isBuyer && !isSeller && !isRider && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate status transitions
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      PENDING: ['RIDER_ASSIGNED', 'CANCELLED'],
      RIDER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
      PICKED_UP: ['ON_THE_WAY', 'CANCELLED'],
      ON_THE_WAY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const currentStatus = existingOrder.status as OrderStatus;
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: status as OrderStatus,
        ...(status === 'RIDER_ASSIGNED' && { riderAssignedAt: new Date() }),
        ...(status === 'PICKED_UP' && { pickedUpAt: new Date() }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                profilePhoto: true,
                avgRating: true,
                totalReviews: true,
                trustLevel: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            email: true,
            avgRating: true,
            totalReviews: true,
            trustLevel: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            profilePhoto: true,
            email: true,
            avgRating: true,
            totalReviews: true,
            trustLevel: true,
          },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}