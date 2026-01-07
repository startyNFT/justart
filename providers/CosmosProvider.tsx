'use client';

import { ChainProvider } from '@cosmos-kit/react';
import { wallets as keplrWallets } from '@cosmos-kit/keplr';
import { wallets as leapWallets } from '@cosmos-kit/leap';
import { ReactNode, useState, useEffect } from 'react';
import type { Chain, AssetList } from '@chain-registry/types';

const stargazeChain = {
  chain_name: 'stargaze',
  chain_id: 'stargaze-1',
  chain_type: 'cosmos',
  pretty_name: 'Stargaze',
  status: 'live',
  network_type: 'mainnet',
  bech32_prefix: 'stars',
  slip44: 118,
  fees: {
    fee_tokens: [
      {
        denom: 'ustars',
        fixed_min_gas_price: 1,
        low_gas_price: 1,
        average_gas_price: 1.1,
        high_gas_price: 1.2,
      },
    ],
  },
  staking: {
    staking_tokens: [{ denom: 'ustars' }],
  },
  apis: {
    rpc: [{ address: 'https://rpc.stargaze-apis.com' }],
    rest: [{ address: 'https://rest.stargaze-apis.com' }],
  },
} as unknown as Chain;

const stargazeAssets = {
  chain_name: 'stargaze',
  assets: [
    {
      type_asset: 'sdk.coin',
      denom_units: [
        { denom: 'ustars', exponent: 0 },
        { denom: 'stars', exponent: 6 },
      ],
      base: 'ustars',
      name: 'Stargaze',
      display: 'stars',
      symbol: 'STARS',
    },
  ],
} as unknown as AssetList;

export function CosmosProvider({ children }: { children: ReactNode }) {
  return (
    <ChainProvider
      chains={[stargazeChain] as any}
      assetLists={[stargazeAssets] as any}
      wallets={[...keplrWallets, ...leapWallets] as any}
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
      throwErrors={false}
    >
      {children}
    </ChainProvider>
  );
}
