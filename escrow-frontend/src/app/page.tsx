'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected && publicKey) {
      router.push('/escrow');
    }
  }, [connected, publicKey, router]);

  return (
    <main className='p-8 min-h-[100dvh] flex flex-col items-center justify-center'>
      <div className='max-w-4xl mx-auto text-center space-y-8'>
        <h1 className='text-4xl font-bold mb-4'>Solana Escrow</h1>

        {!connected && (
          <div className='space-y-4'>
            <p className='text-gray-600'>
              Please connect your wallet to proceed
            </p>
            <WalletMultiButton />
          </div>
        )}

        {connected && publicKey && (
          <div className='space-y-4'>
            <p className='text-green-600'>
              ✅ Wallet connected! Redirecting...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
