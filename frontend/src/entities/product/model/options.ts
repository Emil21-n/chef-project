import type {
  Product,
  ProductOptionGroup,
  SelectedProductOption
} from "@/shared/model/restaurant";

const JUICE_OPTION_GROUP: ProductOptionGroup = {
  id: "flavor",
  label: "Вкус",
  required: true,
  options: [
    { id: "apple", label: "Яблоко" },
    { id: "cherry", label: "Вишня" },
    { id: "orange", label: "Апельсин" },
    { id: "tomato", label: "Томат" }
  ]
};

function isAssortedJuice(product: Product) {
  return product.name.toLowerCase().includes("сок в ассортименте");
}

export function getProductOptionGroups(product: Product): ProductOptionGroup[] {
  if (product.optionGroups?.length) {
    return product.optionGroups;
  }

  if (isAssortedJuice(product)) {
    return [JUICE_OPTION_GROUP];
  }

  return [];
}

export function hasRequiredProductOptions(product: Product) {
  return getProductOptionGroups(product).some((group) => group.required);
}

export function getMissingRequiredOptionGroups(
  product: Product,
  selectedOptions: SelectedProductOption[]
) {
  return getProductOptionGroups(product).filter(
    (group) =>
      group.required &&
      !selectedOptions.some(
        (selectedOption) => selectedOption.groupId === group.id && selectedOption.optionId
      )
  );
}

export function buildSelectedProductOptions(
  product: Product,
  selectedOptionIdsByGroup: Record<string, string>
): SelectedProductOption[] {
  return getProductOptionGroups(product).flatMap((group) => {
    const option = group.options.find(
      (groupOption) => groupOption.id === selectedOptionIdsByGroup[group.id]
    );

    if (!option) return [];

    return [
      {
        groupId: group.id,
        groupLabel: group.label,
        optionId: option.id,
        optionLabel: option.label
      }
    ];
  });
}

export function buildCartItemKey(
  productId: string,
  selectedOptions: SelectedProductOption[]
) {
  if (!selectedOptions.length) return productId;

  const optionsKey = selectedOptions
    .map((option) => `${option.groupId}:${option.optionId}`)
    .sort()
    .join("|");

  return `${productId}__${optionsKey}`;
}

export function formatSelectedOptions(selectedOptions: SelectedProductOption[]) {
  return selectedOptions
    .map((selectedOption) => `${selectedOption.groupLabel}: ${selectedOption.optionLabel}`)
    .join(", ");
}
