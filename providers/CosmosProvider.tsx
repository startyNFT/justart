'use client';

import { ChainProvider } from '@cosmos-kit/react';
import { wallets as keplrWallets } from '@cosmos-kit/keplr';
import { wallets as leapWallets } from '@cosmos-kit/leap';
import { chains, assets } from 'chain-registry';
import { ReactNode } from 'react';

const stargazeChain = chains.find((c) => c.chain_name === 'stargaze');
const stargazeAssets = assets.find((a) => a.chain_name === 'stargaze');

export function CosmosProvider({ children }: { children: ReactNode }) {
  return (
    <ChainProvider
      chains={stargazeChain ? [stargazeChain] : []}
      assetLists={stargazeAssets ? [stargazeAssets] : []}
      wallets={[...keplrWallets, ...leapWallets]}
      walletConnectOptions={{
        signClient: {
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        },
      }}
      signerOptions={{}}
      endpointOptions={{
        endpoints: {
          stargaze: {
            rpc: ['https://rpc.stargaze-apis.com'],
            rest: ['https://rest.stargaze-apis.com'],
          },
        },
      }}
    >
      {children}
    </ChainProvider>
  );
}
