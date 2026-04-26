"use client";

import { heroSlides } from "@/data/menu";
import type { ProductWithSection } from "@/entities/product/model/types";
import { ProductModal } from "@/entities/product/ui/ProductModal";
import { useCart } from "@/features/cart/model/useCart";
import { AddToast } from "@/features/cart/ui/AddToast";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";
import { useHeroSlider } from "@/features/hero-slider/model/useHeroSlider";
import { useMenuCatalog } from "@/features/menu-catalog/model/useMenuCatalog";
import { MenuCatalog } from "@/features/menu-catalog/ui/MenuCatalog";
import { useProductModal } from "@/features/product-preview/model/useProductModal";
import { ClosedHoursNotice } from "@/features/restaurant-status/ui/ClosedHoursNotice";
import { Footer } from "@/layouts/Footer";
import { SiteHeader } from "@/layouts/SiteHeader";
import { ContactsSection } from "@/sections/ContactsSection";
import { FeatureBand } from "@/sections/FeatureBand";
import { HeroSection } from "@/sections/HeroSection";

export function RestaurantPage() {
  const { activeSlide, setActiveSlide } = useHeroSlider(heroSlides.length);
  const menuCatalog = useMenuCatalog();
  const productPreview = useProductModal(menuCatalog.displayedProducts);
  const cart = useCart();

  const addProductFromModal = (product: ProductWithSection, quantity: number) => {
    cart.addProduct(product, quantity);
    productPreview.closeProductModal();
  };

  return (
    <>
      <main id="top">
        <SiteHeader onCartOpen={cart.openCart} totalItems={cart.totalItems} />
        <HeroSection activeSlide={activeSlide} onSlideChange={setActiveSlide} />
        <FeatureBand />
        <MenuCatalog
          activeSection={menuCatalog.activeSection}
          catalogRef={menuCatalog.catalogRef}
          displayedSections={menuCatalog.displayedSections}
          query={menuCatalog.query}
          onCategorySelect={menuCatalog.selectCategory}
          onProductAdd={cart.addProduct}
          onProductOpen={productPreview.openProductModal}
          onQueryChange={menuCatalog.setQuery}
        />
        <ContactsSection />
        <Footer />
      </main>

      {productPreview.selectedProduct ? (
        <ProductModal
          product={productPreview.selectedProduct}
          isOpen={productPreview.productModalOpen}
          canSwitch={menuCatalog.displayedProducts.length > 1}
          onPrevious={() => productPreview.switchSelectedProduct(-1)}
          onNext={() => productPreview.switchSelectedProduct(1)}
          onClose={productPreview.closeProductModal}
          onAdd={addProductFromModal}
        />
      ) : null}

      <CartDrawer
        cart={cart.cart}
        isOpen={cart.cartOpen}
        subtotal={cart.subtotal}
        onClose={cart.closeCart}
        onAdd={cart.addToCart}
        onRemove={cart.removeFromCart}
        onClear={cart.clearCart}
      />
      <AddToast toast={cart.addToast} onUndo={cart.undoLastAddition} />
      <ClosedHoursNotice />
    </>
  );
}
