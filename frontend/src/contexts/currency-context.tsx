"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as customerApi from "@/lib/api/customer";

const CURRENCIES_STORAGE_KEY = "skincare.customer.currencies";
const SELECTED_CURRENCY_STORAGE_KEY = "skincare.customer.selectedCurrency";

type CurrencyContextValue = {
  currencies: customerApi.CustomerCurrency[];
  selectedCurrency: customerApi.CustomerCurrency | null;
  isLoadingCurrencies: boolean;
  setSelectedCurrencyCode: (code: string) => void;
  formatPrice: (baseAmount: number | string) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<customerApi.CustomerCurrency[]>(
    [],
  );
  const [selectedCurrencyCode, setSelectedCurrencyCodeState] = useState<
    string | null
  >(null);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrencies() {
      window.localStorage.removeItem(CURRENCIES_STORAGE_KEY);
      window.localStorage.removeItem(SELECTED_CURRENCY_STORAGE_KEY);

      try {
        const nextCurrencies = await customerApi.getCurrencies();

        if (!isMounted) {
          return;
        }

        setCurrencies(nextCurrencies);
        const nextSelectedCurrency = nextCurrencies[0]?.code;

        setSelectedCurrencyCodeState(nextSelectedCurrency ?? null);
      } finally {
        if (isMounted) {
          setIsLoadingCurrencies(false);
        }
      }
    }

    void loadCurrencies();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCurrency = useMemo(() => {
    return (
      currencies.find((currency) => currency.code === selectedCurrencyCode) ??
      currencies[0] ??
      null
    );
  }, [currencies, selectedCurrencyCode]);

  const setSelectedCurrencyCode = useCallback(
    (code: string) => {
      if (!currencies.some((currency) => currency.code === code)) {
        return;
      }

      setSelectedCurrencyCodeState(code);
    },
    [currencies],
  );

  const formatPrice = useCallback(
    (baseAmount: number | string) => {
      const amount = Number(baseAmount);

      if (!selectedCurrency || Number.isNaN(amount)) {
        return "-";
      }

      const convertedAmount = amount * (selectedCurrency.rate ?? 1);
      const formattedAmount = convertedAmount.toFixed(
        selectedCurrency.decimalDigits,
      );

      return `${selectedCurrency.symbol ?? selectedCurrency.code} ${formattedAmount}`;
    },
    [selectedCurrency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currencies,
      selectedCurrency,
      isLoadingCurrencies,
      setSelectedCurrencyCode,
      formatPrice,
    }),
    [
      currencies,
      formatPrice,
      isLoadingCurrencies,
      selectedCurrency,
      setSelectedCurrencyCode,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }

  return context;
}
