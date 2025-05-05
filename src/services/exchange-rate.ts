/**
 * Represents an exchange rate between two currencies.
 */
export interface ExchangeRate {
  /**
   * The rate to convert from the base currency to the target currency.
   */
  rate: number;
}

/**
 * Asynchronously retrieves the exchange rate between two currencies.
 *
 * @param baseCurrency The base currency (e.g., USD).
 * @param targetCurrency The target currency (e.g., EUR).
 * @returns A promise that resolves to an ExchangeRate object.
 */
export async function getExchangeRate(
  baseCurrency: string,
  targetCurrency: string
): Promise<ExchangeRate> {
  // TODO: Implement this by calling an API.

  return {
    rate: 1.2,
  };
}
