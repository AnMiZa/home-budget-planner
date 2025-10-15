const CURRENCY_FORMATTER = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const MONTH_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
});

export const formatCurrency = (value: number): string => {
  return CURRENCY_FORMATTER.format(value);
};

export const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = value >= 0 && value <= 1 ? value * 100 : value;

  return Math.max(0, Math.min(100, Math.round(normalized)));
};

export const formatPercentage = (value: number): string => {
  const clamped = clampPercentage(value);
  return `${clamped}%`;
};

export const formatMonth = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return capitalizeFirstLetter(MONTH_FORMATTER.format(parsed));
};

const capitalizeFirstLetter = (value: string): string => {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};
