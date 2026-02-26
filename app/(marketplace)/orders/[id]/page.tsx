'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ReviewModal from '@/components/reviews/ReviewModal';
import ProductReviewModal from '@/components/reviews/ProductReviewModal';
import RatingBadge from '@/components/reviews/RatingBadge';
import ReviewList from '@/components/reviews/ReviewList';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  ShoppingBag,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    type: 'SELLER' | 'RIDER' | 'PRODUCT' | null;
  }>({ isOpen: false, type: null });

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/orders/${params.id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else if (response.status === 404) {
        setOrder(null);
      } else {
        console.error('Failed to fetch order');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updated = await response.json();
        setOrder(updated);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'PROCESSING':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'SHIPPED':
        return <Truck className="w-5 h-5 text-purple-500" />;
      case 'DELIVERED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusActions = () => {
    if (!order) return [];
    
    const actions = [];
    const userRole = getCurrentUserRole();

    if (userRole === 'SELLER') {
      if (order.status === 'PENDING') {
        actions.push({ label: 'Process Order', status: 'PROCESSING', variant: 'primary' });
        actions.push({ label: 'Cancel Order', status: 'CANCELLED', variant: 'danger' });
      }
      if (order.status === 'PROCESSING') {
        actions.push({ label: 'Mark as Shipped', status: 'SHIPPED', variant: 'primary' });
      }
    }

    if (userRole === 'RIDER') {
      if (order.status === 'SHIPPED') {
        actions.push({ label: 'Mark as Delivered', status: 'DELIVERED', variant: 'success' });
      }
    }

    if (userRole === 'BUYER') {
      if (order.status === 'PENDING') {
        actions.push({ label: 'Cancel Order', status: 'CANCELLED', variant: 'danger' });
      }
    }

    return actions;
  };

  const getCurrentUserRole = () => {
    if (!order) return null;
    
    // Get current user ID from localStorage or auth context
    const currentUserId = localStorage.getItem('userId') || 'current-user-id';
    
    if (currentUserId === order.buyerId) return 'BUYER';
    if (currentUserId === order.product?.sellerId) return 'SELLER';
    if (currentUserId === order.riderId) return 'RIDER';
    
    return null;
  };

  // Check if user can review product
  const canReviewProduct = (order?.status === 'DELIVERED' || order?.status === 'COMPLETED') && 
    order?.productReviews?.length === 0;

  // Check if user can review seller
  const canReviewSeller = (order?.status === 'DELIVERED' || order?.status === 'COMPLETED') && 
    !order?.reviews?.some((r: any) => r.type === 'SELLER');
  
  const canReviewRider = (order?.status === 'DELIVERED' || order?.status === 'COMPLETED') && 
    order?.rider && 
    !order?.reviews?.some((r: any) => r.type === 'RIDER');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
        <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/orders')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  };

  const statusActions = getStatusActions();
  const userRole = getCurrentUserRole();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/orders')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Orders
      </Button>

      {/* Order header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Order #{order.orderNumber || order.id.slice(-8)}</h1>
          <div className="flex items-center gap-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="font-medium">{order.status.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(order.createdAt), 'MMM dd, yyyy h:mm a')}</span>
            </div>
          </div>
        </div>

        {/* Status actions - FIXED: Changed 'destructive' to 'danger' and 'default' to 'primary' */}
        {statusActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            {statusActions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant as 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'}
                onClick={() => updateOrderStatus(action.status)}
                disabled={updating}
              >
                {updating ? 'Updating...' : action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column - Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product card */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Product Details</h2>
              <Link href={`/product/${order.product?.id}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Product
                </Button>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {order.product?.images?.[0] && (
                <img
                  src={order.product.images[0]}
                  alt={order.product.name}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">{order.product?.name || 'Product'}</h3>
                <p className="text-gray-600 mt-1">{order.product?.description || 'No description'}</p>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="font-bold">₦{(order.product?.price || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-bold">{order.quantity || 1}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="font-bold">₦{((order.product?.price || 0) * (order.quantity || 1)).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Payment */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Shipping info */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Delivery Address</p>
                  <p className="font-medium">{order.deliveryAddress || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{order.phoneNumber || 'Not specified'}</p>
                </div>
                {order.deliveryInstructions && (
                  <div>
                    <p className="text-sm text-gray-500">Delivery Instructions</p>
                    <p className="font-medium">{order.deliveryInstructions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment info */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium">{order.paymentMethod || 'Online Payment'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <div className="flex items-center gap-2">
                    {order.isPaid ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-600">Paid</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-yellow-600">Pending</span>
                      </>
                    )}
                  </div>
                </div>
                {order.paymentReference && (
                  <div>
                    <p className="text-sm text-gray-500">Reference</p>
                    <p className="font-mono text-sm">{order.paymentReference}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section - Only show if delivered */}
          {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Reviews & Feedback
              </h2>
              
              {/* Product Review */}
              <div className="flex items-center justify-between p-4 border rounded-lg mb-4 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Rate this Product</h3>
                    <p className="text-sm text-gray-600">
                      Share your experience with {order.product?.name}
                    </p>
                  </div>
                </div>
                {canReviewProduct ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => router.push(`/orders/${order.id}/review-product`)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                    >
                      <Star className="w-4 h-4" />
                      Review Product
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setReviewModal({ isOpen: true, type: 'PRODUCT' })}
                    >
                      Quick Review
                    </Button>
                  </div>
                ) : order.productReviews?.length > 0 ? (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Product Reviewed
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">Review not available</span>
                )}
              </div>

              {/* Seller Review */}
              <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Rate the Seller</h3>
                    <p className="text-sm text-gray-600">
                      How was your experience with {order.seller?.name || 'the seller'}?
                    </p>
                  </div>
                </div>
                {canReviewSeller ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => router.push(`/orders/${order.id}/review-seller`)}
                      className="flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Review Seller
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setReviewModal({ isOpen: true, type: 'SELLER' })}
                    >
                      Quick Review
                    </Button>
                  </div>
                ) : order.reviews?.some((r: any) => r.type === 'SELLER') ? (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Seller Reviewed
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">Complete product review first</span>
                )}
              </div>

              {/* Rider Review (if applicable) */}
              {order.rider && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Truck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Rate the Rider</h3>
                      <p className="text-sm text-gray-600">
                        How was your delivery experience with {order.rider.name}?
                      </p>
                    </div>
                  </div>
                  {canReviewRider ? (
                    <Button
                      onClick={() => setReviewModal({ isOpen: true, type: 'RIDER' })}
                      className="flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Review Rider
                    </Button>
                  ) : order.reviews?.some((r: any) => r.type === 'RIDER') ? (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Rider Reviewed
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">Review not available</span>
                  )}
                </div>
              )}

              {/* Existing Reviews */}
              {(order.reviews && order.reviews.length > 0) || (order.productReviews && order.productReviews.length > 0) ? (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Your Reviews</h3>
                  <ReviewList reviews={[...(order.reviews || []), ...(order.productReviews || [])]} />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right column - People involved */}
        <div className="space-y-6">
          {/* Buyer Card */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Buyer Information
            </h3>
            <div className="flex items-center gap-3">
              {order.buyer?.profilePhoto ? (
                <img
                  src={order.buyer.profilePhoto}
                  alt={order.buyer.name || 'Buyer'}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <h4 className="font-medium">{order.buyer?.name || 'Anonymous'}</h4>
                <p className="text-sm text-gray-600">{order.buyer?.email || 'No email'}</p>
              </div>
            </div>
          </div>

          {/* Seller Card */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Seller Information
            </h3>
            <div className="flex items-center gap-3 mb-4">
              {order.seller?.profilePhoto ? (
                <img
                  src={order.seller.profilePhoto}
                  alt={order.seller.name || 'Seller'}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <Link 
                  href={`/seller/${order.seller?.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {order.seller?.name || 'Seller'}
                </Link>
                <p className="text-sm text-gray-600">{order.seller?.email || 'No email'}</p>
              </div>
            </div>
            <RatingBadge
              rating={order.seller?.avgRating || 0}
              reviewCount={order.seller?.totalReviews || 0}
              trustLevel={order.seller?.trustLevel || 'BRONZE'}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => router.push(`/seller/${order.seller?.id}`)}
            >
              View Seller Profile
            </Button>
          </div>

          {/* Rider Card (if applicable) */}
          {order.rider && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Rider Information
              </h3>
              <div className="flex items-center gap-3 mb-4">
                {order.rider.profilePhoto ? (
                  <img
                    src={order.rider.profilePhoto}
                    alt={order.rider.name || 'Rider'}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium">{order.rider.name}</h4>
                  <p className="text-sm text-gray-600">{order.rider.email || 'No email'}</p>
                </div>
              </div>
              <RatingBadge
                rating={order.rider.avgRating || 0}
                reviewCount={order.rider.totalReviews || 0}
                trustLevel={order.rider.trustLevel || 'BRONZE'}
              />
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₦{((order.product?.price || 0) * (order.quantity || 1)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping Fee</span>
                <span>₦{(order.shippingFee || 0).toLocaleString()}</span>
              </div>
              {order.platformFee && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee</span>
                  <span>₦{order.platformFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>₦{order.totalAmount?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          {/* Review Status Summary */}
          {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Review Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Product Review</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.productReviews?.length > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.productReviews?.length > 0 ? 'Completed ✓' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Seller Review</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.reviews?.some((r: any) => r.type === 'SELLER')
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.reviews?.some((r: any) => r.type === 'SELLER') ? 'Completed ✓' : 'Pending'}
                  </span>
                </div>
                {order.rider && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Rider Review</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.reviews?.some((r: any) => r.type === 'RIDER')
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.reviews?.some((r: any) => r.type === 'RIDER') ? 'Completed ✓' : 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modals */}
      {reviewModal.type === 'PRODUCT' && (
        <ProductReviewModal
          isOpen={reviewModal.isOpen}
          onClose={() => setReviewModal({ isOpen: false, type: null })}
          orderId={order.id}
          productId={order.product?.id}
          productName={order.product?.name}
          onReviewSubmitted={() => {
            fetchOrder();
            setReviewModal({ isOpen: false, type: null });
          }}
        />
      )}
      
      {(reviewModal.type === 'SELLER' || reviewModal.type === 'RIDER') && (
        <ReviewModal
          isOpen={reviewModal.isOpen}
          onClose={() => setReviewModal({ isOpen: false, type: null })}
          orderId={order.id}
          type={reviewModal.type}
          revieweeName={
            reviewModal.type === 'SELLER'
              ? order.seller?.name || 'Seller'
              : order.rider?.name || 'Rider'
          }
          onReviewSubmitted={() => {
            fetchOrder();
            setReviewModal({ isOpen: false, type: null });
          }}
        />
      )}
    </div>
  );
}