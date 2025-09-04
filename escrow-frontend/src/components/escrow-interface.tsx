'use client';

import { useState } from 'react';
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
import toast from 'react-hot-toast';
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

export function EscrowInterface() {
  const { publicKey, connected } = useWallet();

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
    setIsInitializing(true);

    try {
      const initializerAmount = BigInt(data.initializerAmount.trim());
      const receiverAmount = BigInt(data.receiverAmount.trim());

      if (initializerAmount <= 0 || receiverAmount <= 0) {
        toast.error('Enter a valid amount');
      }

      console.log('Init Payload', {
        initializerToken: data.initializerTokenMint,
        receiverToken: data.receiverTokenMint,
        initializerAmount: data.initializerAmount,
        receiverAmount: data.receiverAmount,
      });

      //sending transaction later

      initializeForm.reset();

      setSuccess('Init Payload ready!');
    } catch (err: any) {
      setErr(err?.message);
      toast.error(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const onDeposit = async (data: DepositEscrow) => {
    setErr(null);
    setIsDepositing(true);

    try {
      const amount = BigInt(data.depositAmount.trim());

      if (amount <= 0) {
        toast.error('Amount must be valid');
      }

      console.log('Deposit Payload', {
        escrowAmount: data.escrowAccount,
        amount: data.depositAmount,
      });

      //sending deposit instruction

      depositForm.reset();

      setSuccess('Deposit Payload Ready!');
    } catch (err: any) {
      setErr(err?.message);
      toast.error(err);
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
      toast.error(err);
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
                Wallet Connected
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
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Initialize Escrow Card */}
          <Card className='shadow-sm border-slate-200'>
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
            <CardContent>
              <Form {...initializeForm}>
                <form
                  onSubmit={initializeForm.handleSubmit(onInitialize)}
                  className='space-y-4'
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

                  <Button
                    type='submit'
                    disabled={isInitializing || !connected}
                    className='w-full bg-blue-600 hover:bg-blue-700 text-white'
                  >
                    {isInitializing
                      ? 'Creating Escrow...'
                      : 'Initialize Escrow'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Deposit Card */}
          <Card className='shadow-sm border-slate-200'>
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
            <CardContent>
              <Form {...depositForm}>
                <form
                  onSubmit={depositForm.handleSubmit(onDeposit)}
                  className='space-y-4'
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

                  <Button
                    type='submit'
                    disabled={isDepositing || !connected}
                    className='w-full bg-green-600 hover:bg-green-700 text-white'
                  >
                    {isDepositing ? 'Depositing...' : 'Deposit Tokens'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Complete Swap Card */}
          <Card className='shadow-sm border-slate-200'>
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
