'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  EscrowData,
  InitializeEscrow,
  InitializeEscrowSchema,
  DepositEscrow,
  DepositEscrowSchema,
  CompletedEscrow,
  CompletedEscrowSchema,
  CancelledEscrow,
  CancelledEscrowSchema,
} from '@/validators/escrow.validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast, { ToastBar } from 'react-hot-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  Wallet,
  ArrowRightLeft,
  DollarSign,
  X,
} from 'lucide-react';
import {
  initializeEscrow,
  depositEscrow,
  readEscrowData,
} from '@/helpers/client';
import { connection } from '@/helpers/connection';
import { parseTokenAmount, getTokenDecimals } from '@/helpers/ata';

export function EscrowInterface() {
  const { publicKey, connected, signTransaction } = useWallet();

  // form instances
  const initializeForm = useForm<InitializeEscrow>({
    resolver: zodResolver(InitializeEscrowSchema),
    defaultValues: {
      initializerTokenMint: '',
      receiverTokenMint: '',
      initializerAmount: '',
      receiverAmount: '',
    },
  });

  const depositForm = useForm<DepositEscrow>({
    resolver: zodResolver(DepositEscrowSchema),
    defaultValues: {
      escrowAccount: '',
      depositAmount: '',
    },
  });

  const completeForm = useForm<CompletedEscrow>({
    resolver: zodResolver(CompletedEscrowSchema),
    defaultValues: {
      escrowAccount: '',
    },
  });

  const cancelForm = useForm<CancelledEscrow>({
    resolver: zodResolver(CancelledEscrowSchema),
    defaultValues: {
      escrowAccount: '',
    },
  });

  //operations
  const [escrowAmount, setEscrowAccount] = useState<string>('');
  const [depositorAmount, setDepositorAmount] = useState<string>('');

  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [escrowData, setEscrowData] = useState<EscrowData | null>(null);

  const onInitialize = async (data: InitializeEscrow) => {
    setErr(null);
    setSuccess(null);
    setIsInitializing(true);

    try {
      if (!connected || !publicKey) {
        toast.error('Please connect your wallet first');
      }

      const tokenAMint = new PublicKey(data.initializerTokenMint);
      const tokenBMint = new PublicKey(data.receiverTokenMint);

      const tokenADecimals = await getTokenDecimals(connection, tokenAMint);
      const tokenBDecimals = await getTokenDecimals(connection, tokenBMint);

      //raw inputs
      const amountA = parseTokenAmount(
        data.initializerAmount.trim(),
        tokenADecimals
      );
      const amountB = parseTokenAmount(
        data.receiverAmount.trim(),
        tokenBDecimals
      );

      if (amountA <= 0 || amountB <= 0) {
        toast.error('Please enter valid amount');
      }

      const wallet = { publicKey, signTransaction };
      const res = await initializeEscrow({
        connection,
        userWallet: wallet,
        tokenAMint,
        tokenBMint,
        amountA,
        amountB,
      });

      initializeForm.reset();
      toast.success('Escrow initialized successfully!');
      setSuccess(
        `Escrow created! Escrow Account: ${
          res.escrowAccount
        } | TX: ${res.txId.slice(0, 8)}...`
      );
    } catch (err: any) {
      setErr(err?.message);
      toast.error(err?.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const onDeposit = async (data: DepositEscrow) => {
    setErr(null);
    setIsDepositing(true);

    try {
      if (!connected || !publicKey) {
        toast.error('Please connect your wallet first');
        return;
      }

      let escrowAccountPubkey: PublicKey;

      try {
        escrowAccountPubkey = new PublicKey(data.escrowAccount.trim());
      } catch (err) {
        toast.error('Invalid escrow account address');
        return;
      }

      const amount = BigInt(data.depositAmount.trim());

      if (amount <= 0) {
        toast.error('Amount must be valid');
      }

      const escrowData = await readEscrowData(connection, escrowAccountPubkey);

      const isUserA = publicKey.equals(escrowData.user_a);
      const isUserB =
        escrowData.user_b.equals(PublicKey.default) ||
        publicKey.equals(escrowData.user_b);

      if (!isUserA || !isUserB) {
        toast.error('You are not authorized to deposit to this escrow');
        return;
      }

      if (!isUserA && escrowData.token_a_deposited) {
        toast.error('Token A already deposited');
        return;
      }

      if (!isUserB && escrowData.token_b_deposited) {
        toast.error('Token B already deposited');
        return;
      }

      const tokenMint = isUserA
        ? escrowData.token_a_mint
        : escrowData.token_b_mint;
      const expectedAmount = isUserA
        ? escrowData.amount_a
        : escrowData.amount_b;

      if (amount != expectedAmount) {
        toast.error(`Expected Amount was: ${expectedAmount} but got ${amount}`);
        return;
      }

      const wallet = { publicKey, signTransaction };

      const res = await depositEscrow({
        connection,
        userWallet: wallet,
        escrowAccount: escrowAccountPubkey,
        tokenMint,
        amount,
      });

      depositForm.reset();
      toast.success('Tokens deposited successfully!');
      setSuccess(`Deposit successfull! Transaction: ${res.txId}`);
    } catch (err: any) {
      console.error(err);
      setErr(err?.message);
      toast.error(err?.message);
      return;
    } finally {
      setIsDepositing(false);
    }
  };

  const onComplete = async (data: CompletedEscrow) => {
    setErr(null);
    setIsCompleting(true);

    try {
      const escrowPK = data.escrowAccount.trim();

      if (!escrowPK) toast.error('Escrow account is required!');

      console.log('Completion Payload!', {
        escrowAccount: data.escrowAccount,
      });

      //sending on chain call

      completeForm.reset();
      setSuccess('Complete payload ready!');
    } catch (err: any) {
      setErr(err?.message);
      toast(err);
    } finally {
      setIsCompleting(false);
    }
  };

  const onCancel = async (data: CancelledEscrow) => {
    setErr(null);
    setIsCancelling(true);

    try {
      const escrowPK = data.escrowAccount.trim();

      if (!escrowPK) toast.error('Escrow account is required!');

      console.log('Cancellation Payload!', {
        escrowAccount: data.escrowAccount,
      });

      //sending cancel login

      cancelForm.reset();
      setSuccess('Cancel payload ready!');
    } catch (err: any) {
      setErr(err?.message);
      toast.error(err?.message);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <div className='mx-auto max-w-6xl space-y-8'>
        {/* Header */}
        <div className='text-center space-y-4'>
          <h1 className='text-4xl font-bold tracking-tight text-slate-900'>
            Solana Escrow
          </h1>
          <p className='text-lg text-slate-600 max-w-2xl mx-auto'>
            Secure token swaps with trustless escrow on Solana blockchain
          </p>

          {/* Wallet Status */}
          <div className='flex items-center justify-center gap-2'>
            <Wallet className='h-4 w-4' />
            {connected ? (
              <Badge
                variant='default'
                className='bg-green-100 text-green-800 border-green-200'
              >
                {publicKey?.toString().slice(0, 8)}...
                {publicKey?.toString().slice(-8)};
              </Badge>
            ) : (
              <Badge
                variant='secondary'
                className='bg-yellow-100 text-yellow-800 border-yellow-200'
              >
                Connect Wallet
              </Badge>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {err && (
          <Alert className='border-red-200 bg-red-50'>
            <AlertCircle className='h-4 w-4 text-red-600' />
            <AlertDescription className='text-red-800'>{err}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className='border-green-200 bg-green-50'>
            <CheckCircle className='h-4 w-4 text-green-600' />
            <AlertDescription className='text-green-800'>
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Forms Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch'>
          {/* Initialize Escrow Card */}
          <Card className='shadow-sm border-slate-200 flex flex-col h-full'>
            <CardHeader className='space-y-2'>
              <div className='flex items-center gap-2'>
                <ArrowRightLeft className='h-5 w-5 text-blue-600' />
                <CardTitle className='text-xl text-slate-900'>
                  Initialize Escrow
                </CardTitle>
              </div>
              <CardDescription className='text-slate-600'>
                Create a new escrow for token swapping
              </CardDescription>
            </CardHeader>
            <CardContent className='flex-1 flex flex-col'>
              <Form {...initializeForm}>
                <form
                  onSubmit={initializeForm.handleSubmit(onInitialize)}
                  className='flex-1 flex flex-col space-y-4'
                >
                  <FormField
                    control={initializeForm.control}
                    name='initializerTokenMint'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-slate-700'>
                          Your Token Mint
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='Enter token mint address...'
                            className='border-slate-200 focus:border-blue-500'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={initializeForm.control}
                    name='receiverTokenMint'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-slate-700'>
                          Desired Token Mint
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='Enter token mint address...'
                            className='border-slate-200 focus:border-blue-500'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={initializeForm.control}
                      name='initializerAmount'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-slate-700'>
                            Your Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder='0.00'
                              className='border-slate-200 focus:border-blue-500'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={initializeForm.control}
                      name='receiverAmount'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-slate-700'>
                            Desired Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder='0.00'
                              className='border-slate-200 focus:border-blue-500'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className='mt-auto pt-4'>
                    <Button
                      type='submit'
                      disabled={isInitializing || !connected}
                      className='w-full bg-blue-600 hover:bg-blue-700 text-white'
                    >
                      {isInitializing
                        ? 'Creating Escrow...'
                        : 'Initialize Escrow'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Deposit Card */}
          <Card className='shadow-sm border-slate-200 flex flex-col h-full'>
            <CardHeader className='space-y-2'>
              <div className='flex items-center gap-2'>
                <DollarSign className='h-5 w-5 text-green-600' />
                <CardTitle className='text-xl text-slate-900'>
                  Deposit Tokens
                </CardTitle>
              </div>
              <CardDescription className='text-slate-600'>
                Deposit tokens into an existing escrow
              </CardDescription>
            </CardHeader>
            <CardContent className='flex-1 flex flex-col'>
              <Form {...depositForm}>
                <form
                  onSubmit={depositForm.handleSubmit(onDeposit)}
                  className='flex-1 flex flex-col space-y-4'
                >
                  <FormField
                    control={depositForm.control}
                    name='escrowAccount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-slate-700'>
                          Escrow Account
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='Enter escrow account address...'
                            className='border-slate-200 focus:border-green-500'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={depositForm.control}
                    name='depositAmount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-slate-700'>
                          Deposit Amount
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='0.00'
                            className='border-slate-200 focus:border-green-500'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className='mt-auto pt-4'>
                    <Button
                      type='submit'
                      disabled={isDepositing || !connected}
                      className='w-full bg-green-600 hover:bg-green-700 text-white'
                    >
                      {isDepositing ? 'Depositing...' : 'Deposit Tokens'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Complete Swap Card */}
          <Card className='shadow-sm border-slate-200 flex flex-col h-full'>
            <CardHeader className='space-y-2'>
              <div className='flex items-center gap-2'>
                <CheckCircle className='h-5 w-5 text-purple-600' />
                <CardTitle className='text-xl text-slate-900'>
                  Complete Swap
                </CardTitle>
              </div>
              <CardDescription className='text-slate-600'>
                Finalize an escrow swap transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...completeForm}>
                <form
                  onSubmit={completeForm.handleSubmit(onComplete)}
                  className='space-y-4'
                >
                  <FormField
                    control={completeForm.control}
                    name='escrowAccount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-slate-700'>
                          Escrow Account
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='Enter escrow account address...'
                            className='border-slate-200 focus:border-purple-500'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type='submit'
                    disabled={isCompleting || !connected}
                    className='w-full bg-purple-600 hover:bg-purple-700 text-white'
                  >
                    {isCompleting ? 'Completing...' : 'Complete Swap'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Cancel Escrow Card */}
          <Card className='shadow-sm border-slate-200'>
            <CardHeader className='space-y-2'>
              <div className='flex items-center gap-2'>
                <X className='h-5 w-5 text-red-600' />
                <CardTitle className='text-xl text-slate-900'>
                  Cancel Escrow
                </CardTitle>
              </div>
              <CardDescription className='text-slate-600'>
                Cancel an existing escrow and reclaim tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form
                  onSubmit={cancelForm.handleSubmit(onCancel)}
                  className='space-y-4'
                >
                  <FormField
                    control={cancelForm.control}
                    name='escrowAccount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-slate-700'>
                          Escrow Account
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='Enter escrow account address...'
                            className='border-slate-200 focus:border-red-500'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type='submit'
                    variant='destructive'
                    disabled={isCancelling || !connected}
                    className='w-full'
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Escrow'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
