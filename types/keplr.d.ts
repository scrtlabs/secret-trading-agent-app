interface Window {
  keplr?: {
    enable(chainId: string): Promise<void>;
    getOfflineSigner(chainId: string): {
      getAccounts(): Promise<Array<{ address: string; pubkey: Uint8Array }>>;
    };
    signArbitrary(
      chainId: string,
      signer: string,
      data: string
    ): Promise<{
      signature: string;
      pub_key: {
        type: string;
        value: string;
      };
    }>;
    getKey(chainId: string): Promise<{
      name: string;
      algo: string;
      pubKey: Uint8Array;
      address: Uint8Array;
      bech32Address: string;
    }>;
    experimentalSuggestChain(chainInfo: any): Promise<void>;
  };
}

declare global {
  interface Window {
    keplr?: Window['keplr'];
  }
}

export {};