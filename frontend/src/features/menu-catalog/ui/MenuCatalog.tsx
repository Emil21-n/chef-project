"use client";

import type { RefObject } from "react";

import type {
  MenuSectionWithProducts,
  ProductWithSection
} from "@/entities/product/model/types";
import { ProductCard } from "@/entities/product/ui/ProductCard";
import type { CartItem } from "@/features/cart/model/types";
import type { MenuSection } from "@/shared/model/restaurant";
import { SearchIcon } from "@/shared/ui/icons";

type MenuCatalogProps = {
  activeSection: string;
  catalogRef: RefObject<HTMLDivElement | null>;
  cart: CartItem[];
  displayedSections: MenuSectionWithProducts[];
  menuSections: MenuSection[];
  query: string;
  onCategorySelect: (id: string) => void;
  onCartItemDecrease: (cartKey: string) => void;
  onCartItemIncrease: (cartKey: string) => void;
  onProductAdd: (product: ProductWithSection) => void;
  onProductOpen: (product: ProductWithSection) => void;
  onQueryChange: (value: string) => void;
};

export function MenuCatalog({
  activeSection,
  catalogRef,
  cart,
  displayedSections,
  menuSections,
  query,
  onCategorySelect,
  onCartItemDecrease,
  onCartItemIncrease,
  onProductAdd,
  onProductOpen,
  onQueryChange
}: MenuCatalogProps) {
  const normalizedQuery = query.trim();
  const hasNoResults = displayedSections.length === 0;

  return (
    <section className="menuSection" id="menu">
      <div className="sectionInner">
        <div className="menuIntro">
          <div>
            <span className="eyebrow">Меню</span>
            <h2>Каталог блюд</h2>
          </div>
          <label className="searchBox">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Поиск по меню"
            />
          </label>
        </div>

        <div className="categoryBar" aria-label="Категории меню">
          <button
            className={activeSection === "all" ? "isActive" : ""}
            type="button"
            onClick={() => onCategorySelect("all")}
          >
            Все
          </button>
          {menuSections.map((section) => (
            <button
              className={activeSection === section.id ? "isActive" : ""}
              type="button"
              onClick={() => onCategorySelect(section.id)}
              key={section.id}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="catalog" ref={catalogRef}>
          {hasNoResults ? (
            <div className="menuEmptyState emptyCart" role="status" aria-live="polite">
              <span className="menuEmptyIcon">
                <SearchIcon />
              </span>
              <strong>Ничего не нашли</strong>
              <p>
                {normalizedQuery
                  ? `По запросу "${normalizedQuery}" блюд нет. Проверьте раскладку или попробуйте другую категорию.`
                  : "В этой категории пока нет блюд."}
              </p>
              <button
                className="primaryCta menuEmptyButton"
                type="button"
                onClick={() => onQueryChange("")}
              >
                Сбросить поиск
              </button>
            </div>
          ) : (
            displayedSections.map((section) => (
              <section className="catalogGroup" id={section.id} key={section.id}>
                <div className="catalogHeader">
                  <h2>{section.title}</h2>
                  <span>{section.products.length} поз.</span>
                </div>
                <div className="productGrid">
                  {section.products.map((product) => {
                    const cartItem = cart.find((item) => item.cartKey === product.id);

                    return (
                      <ProductCard
                        product={product}
                        cartItem={cartItem}
                        onOpen={onProductOpen}
                        onAdd={onProductAdd}
                        onDecrease={onCartItemDecrease}
                        onIncrease={onCartItemIncrease}
                        key={product.id}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
