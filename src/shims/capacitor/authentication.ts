export interface SignInResult {
  credential?: {
    idToken?: string;
    accessToken?: string;
    nonce?: string;
  };
  user?: any;
}

export const FirebaseAuthentication = {
  signInWithGoogle: async (_options?: { skipNativeAuth?: boolean }): Promise<SignInResult> => {
    throw new Error("Native Google Sign In is only available on native platforms");
  },
  signInWithApple: async (_options?: { skipNativeAuth?: boolean }): Promise<SignInResult> => {
    throw new Error("Native Apple Sign In is only available on native platforms");
  },
};
