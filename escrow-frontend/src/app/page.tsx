'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
    if (connected && publicKey) {
      router.push('/escrow');
    }
  }, [connected, publicKey, router]);

  return (
    <main className='p-8 min-h-[100dvh] flex flex-col items-center justify-center'>
      <div className='max-w-4xl mx-auto text-center space-y-8'>
        <h1 className='text-4xl font-bold mb-4'>Solana Escrow</h1>

        <div className='flex items-center justify-center gap-2'>
          <Wallet className='h-4 w-4' />
          {!isClient ? (
            // Show loading state during hydration
            <Badge
              variant='secondary'
              className='bg-gray-100 text-gray-800 border-gray-200'
            >
              Loading...
            </Badge>
          ) : connected ? (
            <Badge
              variant='default'
              className='bg-green-100 text-green-800 border-green-200'
            >
              {publicKey?.toString().slice(0, 8)}...
              {publicKey?.toString().slice(-8)}
            </Badge>
          ) : (
            <WalletMultiButton />
          )}
        </div>
      </div>
    </main>
  );
}
