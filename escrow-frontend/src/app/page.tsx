'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  const { publicKey, connected } = useWallet();

  return (
    <main className='p-8 min-h-[100dvh]'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold mb-8'>Solana Escrow</h1>
        <div className='space-y-4'>
          <WalletMultiButton />

          {connected && publicKey && (
            <div className='p-4 bg-green-100 rounded-lg'>
              <p className='text-green-800'>
                Connected: {publicKey.toString().slice(0, 8)}...
                {publicKey.toString().slice(-8)}
              </p>
            </div>
          )}

          {!connected && (
            <div className='p-4 rounded-lg bg-gray-100'>
              <p className='text-gray-600'>Please connect your wallet</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
