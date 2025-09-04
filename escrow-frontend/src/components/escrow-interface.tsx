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
    <div>
      <h1>Escrow Interface</h1>

      {/* init form */}
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
                <FormLabel>Initializer Token Mint</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Receiver Token Mint</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={initializeForm.control}
            name='initializerAmount'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initializer Amount</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Receiver Amount</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={isInitializing}>
            {isInitializing ? 'Initializing…' : 'Initialize Escrow'}
          </Button>
        </form>
      </Form>

      {/* deposit form */}
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
                <FormLabel>Escrow Account (pubkey)</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Deposit Amount</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={isDepositing}>
            {isDepositing ? 'Depositing…' : 'Deposit'}
          </Button>
        </form>
      </Form>

      {/* completion form */}
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
                <FormLabel>Escrow Account (to complete)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={isCompleting || !connected}>
            {isCompleting ? 'Completing…' : 'Complete Swap'}
          </Button>
        </form>
      </Form>

      {/* cancellation form */}
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
                <FormLabel>Escrow Account (to cancel)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type='submit'
            variant='destructive'
            disabled={isCancelling || !connected}
          >
            {isCancelling ? 'Cancelling…' : 'Cancel Escrow'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
