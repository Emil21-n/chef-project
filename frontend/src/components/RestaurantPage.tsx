"use client";

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
import type { RestaurantData, SelectedProductOption } from "@/shared/model/restaurant";

type RestaurantPageProps = {
  data: RestaurantData;
};

export function RestaurantPage({ data }: RestaurantPageProps) {
  const { menuSections, heroSlides, contactInfo, minOrder } = data;
  const { activeSlide, setActiveSlide } = useHeroSlider(heroSlides.length);
  const menuCatalog = useMenuCatalog(menuSections);
  const productPreview = useProductModal(menuCatalog.displayedProducts);
  const cart = useCart();

  const addProductFromModal = (
    product: ProductWithSection,
    quantity: number,
    selectedOptions: SelectedProductOption[]
  ) => {
    const added = cart.addProduct(product, quantity, selectedOptions);

    if (added) {
      productPreview.closeProductModal();
    }

    return added;
  };

  return (
    <>
      <main id="top">
        <SiteHeader
          contactInfo={contactInfo}
          onCartOpen={cart.openCart}
          totalItems={cart.totalItems}
        />
        <HeroSection
          activeSlide={activeSlide}
          contactInfo={contactInfo}
          heroSlides={heroSlides}
          onSlideChange={setActiveSlide}
        />
        <FeatureBand heroSlides={heroSlides} />
        <MenuCatalog
          activeSection={menuCatalog.activeSection}
          catalogRef={menuCatalog.catalogRef}
          cart={cart.cart}
          displayedSections={menuCatalog.displayedSections}
          menuSections={menuSections}
          query={menuCatalog.query}
          onCategorySelect={menuCatalog.selectCategory}
          onCartItemDecrease={cart.removeFromCart}
          onCartItemIncrease={cart.increaseCartItem}
          onProductAdd={cart.addProduct}
          onProductOpen={productPreview.openProductModal}
          onQueryChange={menuCatalog.setQuery}
        />
        <ContactsSection contactInfo={contactInfo} />
        <Footer contactInfo={contactInfo} />
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
        minOrder={minOrder}
        subtotal={cart.subtotal}
        onClose={cart.closeCart}
        onAdd={cart.increaseCartItem}
        onRemove={cart.removeFromCart}
        onClear={cart.clearCart}
      />
      <AddToast toast={cart.addToast} onUndo={cart.undoLastAddition} />
      <ClosedHoursNotice contactInfo={contactInfo} />
    </>
  );
}
