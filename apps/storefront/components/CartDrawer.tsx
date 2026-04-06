"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { calculateProductPrice, formatRupees } from "@/lib/utils";

export default function CartDrawer() {
  const { cartItems, isCartDrawerOpen, setCartDrawerOpen, removeFromCart, updateCartQuantity } = useStore();

  if (!isCartDrawerOpen) return null;

  const cartTotal = cartItems.reduce((sum, item) => {
    const price = calculateProductPrice(item.product);
    return sum + price.total * item.quantity;
  }, 0);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 cart-drawer-overlay z-40"
        onClick={() => setCartDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-navy">
            Shopping Bag ({cartItems.length})
          </h2>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-navy/60" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="w-16 h-16 text-navy/10 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-navy/40 text-sm mb-4">Your bag is empty</p>
              <button
                type="button"
                onClick={() => setCartDrawerOpen(false)}
                className="text-gold font-medium text-sm hover:text-gold-dark transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const price = calculateProductPrice(item.product);
                const primaryImage = item.product.images.find((img) => img.isPrimary) ?? item.product.images[0];

                return (
                  <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-50">
                    <Link
                      href={`/product/${item.product.id}`}
                      onClick={() => setCartDrawerOpen(false)}
                      className="w-20 h-20 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0"
                    >
                      <img
                        src={primaryImage?.url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.product.id}`}
                        onClick={() => setCartDrawerOpen(false)}
                        className="text-sm font-medium text-navy hover:text-gold transition-colors line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-[10px] text-navy/50 mt-0.5">
                        {item.product.purityLabel} {item.product.metalType} &middot; {item.product.netWeightGrams}g
                        {item.selectedSize && ` &middot; Size ${item.selectedSize}`}
                      </p>
                      <p className="text-sm font-bold text-navy mt-1">
                        {formatRupees(price.total / 100)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-navy/60 hover:text-navy transition-colors"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-navy/60 hover:text-navy transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-navy/30 hover:text-rose-500 transition-colors ml-auto"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-navy/60">Subtotal</span>
              <span className="font-bold text-navy">{formatRupees(cartTotal / 100)}</span>
            </div>
            <p className="text-[10px] text-navy/40">Shipping & taxes calculated at checkout</p>
            <Link
              href="/cart"
              onClick={() => setCartDrawerOpen(false)}
              className="block w-full bg-gold text-white text-center font-semibold py-3 rounded-lg hover:bg-gold-dark transition-colors"
            >
              View Cart
            </Link>
            <Link
              href="/checkout"
              onClick={() => setCartDrawerOpen(false)}
              className="block w-full bg-navy text-white text-center font-semibold py-3 rounded-lg hover:bg-navy-light transition-colors"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
