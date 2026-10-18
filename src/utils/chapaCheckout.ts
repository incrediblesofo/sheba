/**
 * Sheba Sound — Chapa Inline Checkout Utility
 * ---------------------------------------------
 * Uses Chapa's Inline.js SDK to render a payment form directly
 * inside the app (no popup, no redirect, no white page).
 *
 * The inline form shows:
 *  - Phone number input
 *  - Payment method selection (telebirr, cbebirr, mpesa, etc.)
 *  - Pay button
 *
 * After payment, callbacks fire to notify the app.
 *
 * The SDK is loaded from Chapa's CDN on first use (recommended by Chapa).
 */

const CHAPA_CDN_URL = "https://js.chapa.co/v1/inline.js";

declare global {
  interface Window {
    ChapaCheckout: new (options: ChapaCheckoutConfig) => ChapaCheckoutInstance;
  }
}

interface ChapaCheckoutConfig {
  publicKey: string;
  amount: string;
  currency: string;
  tx_ref: string;
  availablePaymentMethods?: string[];
  callbackUrl?: string;
  returnUrl?: string;
  mobile?: string;
  customizations?: {
    buttonText?: string;
    styles?: string;
    successMessage?: string;
  };
  onSuccessfulPayment?: (data: unknown, refId: string) => void;
  onPaymentFailure?: (error: string) => void;
  onClose?: () => void;
}

interface ChapaCheckoutInstance {
  initialize: (containerId: string) => void;
}

export interface ChapaInlineOptions {
  /** Chapa public key */
  publicKey: string;
  /** Amount in ETB */
  amount: string;
  /** Transaction reference from the backend */
  txRef: string;
  /** Backend webhook URL for Chapa to notify */
  callbackUrl: string;
  /** Frontend return URL after payment */
  returnUrl: string;
  /** DOM element ID to render the form into */
  containerId: string;
  /** Called when payment succeeds */
  onSuccess?: (data: unknown, refId: string) => void;
  /** Called when payment fails */
  onFailure?: (error: string) => void;
  /** Called when user closes the popup */
  onClose?: () => void;
}

/** Tracks whether the CDN script is loaded */
let chapaScriptLoaded = false;
let chapaScriptLoading: Promise<void> | null = null;

/**
 * Dynamically loads the Chapa Inline.js SDK from CDN.
 * Returns a promise that resolves when the script is ready.
 */
function loadChapaScript(): Promise<void> {
  if (chapaScriptLoaded && window.ChapaCheckout) {
    return Promise.resolve();
  }

  if (chapaScriptLoading) {
    return chapaScriptLoading;
  }

  chapaScriptLoading = new Promise<void>((resolve, reject) => {
    // Check if the script tag already exists
    const existing = document.querySelector(`script[src="${CHAPA_CDN_URL}"]`);
    if (existing) {
      if (window.ChapaCheckout) {
        chapaScriptLoaded = true;
        resolve();
      } else {
        existing.addEventListener("load", () => {
          chapaScriptLoaded = true;
          resolve();
        });
        existing.addEventListener("error", () => {
          reject(new Error("Failed to load Chapa SDK"));
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = CHAPA_CDN_URL;
    script.async = true;
    script.onload = () => {
      chapaScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      chapaScriptLoading = null;
      reject(new Error("Failed to load Chapa payment SDK. Please check your internet connection."));
    };
    document.head.appendChild(script);
  });

  return chapaScriptLoading;
}

/**
 * Loads the Chapa SDK and initializes the inline checkout form
 * inside the given container element.
 */
export async function initChapaInline(options: ChapaInlineOptions): Promise<void> {
  const {
    publicKey,
    amount,
    txRef,
    callbackUrl,
    returnUrl,
    containerId,
    onSuccess,
    onFailure,
    onClose,
  } = options;

  try {
    await loadChapaScript();
  } catch (err) {
    console.error("Failed to load Chapa SDK:", err);
    onFailure?.("Payment system unavailable. Please check your internet connection and try again.");
    return;
  }

  if (!window.ChapaCheckout) {
    console.error("ChapaCheckout is not available on window after loading the SDK.");
    onFailure?.("Payment system unavailable. Please try again.");
    return;
  }

  const chapa = new window.ChapaCheckout({
    publicKey,
    amount: String(amount),
    currency: "ETB",
    tx_ref: txRef,
    availablePaymentMethods: ["telebirr", "cbebirr", "ebirr", "mpesa"],
    callbackUrl,
    returnUrl,
    customizations: {
      buttonText: "Pay Now",
      successMessage: "Payment successful! Your premium subscription is now active.",
      styles: `
        .chapa-pay-button {
          background-color: #7DC400;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background-color 0.3s, transform 0.15s;
        }
        .chapa-pay-button:hover {
          background-color: #6baf00;
          transform: scale(1.01);
        }
        .chapa-pay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .chapa-phone-input-wrapper {
          border-radius: 10px;
          border: 1.5px solid #d1d5db;
        }
        .chapa-phone-input-wrapper:hover,
        .chapa-phone-input-wrapper:focus-within {
          border-color: #7DC400;
          box-shadow: 0 0 0 3px rgba(125, 196, 0, 0.14);
        }
        .chapa-payment-method {
          border-radius: 8px;
          transition: all 0.2s;
        }
        .chapa-payment-method:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .chapa-selected {
          background-color: rgba(125, 196, 0, 0.1);
          box-shadow: 0 0 0 2px #7DC400;
        }
        .chapa-error {
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
          background: rgba(255, 59, 48, 0.08);
        }
      `,
    },
    onSuccessfulPayment: (data: unknown, refId: string) => {
      onSuccess?.(data, refId);
    },
    onPaymentFailure: (error: string) => {
      onFailure?.(error);
    },
    onClose: () => {
      onClose?.();
    },
  });

  chapa.initialize(containerId);
}
