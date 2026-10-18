/**
 * Sheba Sound — Google Identity Services (GSI) Type Declarations
 * ----------------------------------------------------------------
 * Minimal typings for the `google.accounts.id` namespace loaded by
 * https://accounts.google.com/gsi/client
 */

declare namespace google {
  namespace accounts {
    namespace id {
      interface IdConfiguration {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        context?: 'signin' | 'signup' | 'use';
        itp_support?: boolean;
        ux_mode?: 'popup' | 'redirect';
      }

      interface CredentialResponse {
        /** The Google ID token (JWT). */
        credential: string;
        select_by?: string;
        clientId?: string;
      }

      function initialize(config: IdConfiguration): void;

      function prompt(
        momentListener?: (notification: PromptMomentNotification) => void,
      ): void;

      interface PromptMomentNotification {
        isDisplayMoment(): boolean;
        isDisplayed(): boolean;
        isNotDisplayed(): boolean;
        getNotDisplayedReason(): string;
        isSkippedMoment(): boolean;
        getSkippedReason(): string;
        isDismissedMoment(): boolean;
        getDismissedReason(): string;
      }

      function renderButton(
        parent: HTMLElement,
        options: GsiButtonConfiguration,
      ): void;

      interface GsiButtonConfiguration {
        type?: 'standard' | 'icon';
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: string;
        locale?: string;
      }

      function disableAutoSelect(): void;
    }
  }
}
