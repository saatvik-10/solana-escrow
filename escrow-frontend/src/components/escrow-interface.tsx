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

export function EscrowInterface() {
  const { publicKey, connected } = useWallet();

  //initialization form states
  const {
    register: initializeRegister,
    handleSubmit: initializeHandleSubmit,
    formState: { errors: initializeErrors },
    reset: initializeReset,
  } = useForm<InitializeEscrow>({
    resolver: zodResolver(InitializeEscrowSchema),
  });

  const {
    register: depositRegister,
    handleSubmit: depositHandleSubmit,
    formState: { errors: depositErrors },
    reset: depositReset,
  } = useForm<DepositEscrow>({
    resolver: zodResolver(DepositEscrowSchema),
  });

  const {
    register: completeRegister,
    handleSubmit: completeHandleSubmit,
    formState: { errors: completeErrors },
    reset: completeReset,
  } = useForm<CompletedEscrow>({
    resolver: zodResolver(CompletedEscrowSchema),
  });

  const {
    register: cancelRegister,
    handleSubmit: cancelHandleSubmit,
    formState: { errors: cancelErrors },
    reset: cancelReset,
  } = useForm<CancelledEscrow>({
    resolver: zodResolver(CancelledEscrowSchema),
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

      initializeReset();

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

      depositReset();

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

      completeReset();
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

      cancelReset();
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
      <form
        onSubmit={initializeHandleSubmit(onInitialize)}
        className='space-y-3'
      >
        <div>
          <label>Initializer Token Mint</label>
          <input
            {...initializeRegister('initializerTokenMint')}
            className='w-full'
          />
          {initializeErrors.initializerTokenMint && (
            <p className='text-sm text-red-600'>
              {initializeErrors.initializerTokenMint.message}
            </p>
          )}
        </div>

        <div>
          <label>Receiver Token Mint</label>
          <input
            {...initializeRegister('receiverTokenMint')}
            className='w-full'
          />
          {initializeErrors.receiverTokenMint && (
            <p className='text-sm text-red-600'>
              {initializeErrors.receiverTokenMint.message}
            </p>
          )}
        </div>

        <div>
          <label>Initializer Amount</label>
          <input
            {...initializeRegister('initializerAmount')}
            className='w-full'
          />
          {initializeErrors.initializerAmount && (
            <p className='text-sm text-red-600'>
              {initializeErrors.initializerAmount.message}
            </p>
          )}
        </div>

        <div>
          <label>Receiver Amount</label>
          <input {...initializeRegister('receiverAmount')} className='w-full' />
          {initializeErrors.receiverAmount && (
            <p className='text-sm text-red-600'>
              {initializeErrors.receiverAmount.message}
            </p>
          )}
        </div>

        <button disabled={isInitializing} className='btn-primary'>
          {isInitializing ? 'Initializing…' : 'Initialize Escrow'}
        </button>
      </form>

      {/* deposit form */}
      <form onSubmit={depositHandleSubmit(onDeposit)} className='space-y-3'>
        <div>
          <label>Escrow Account (pubkey)</label>
          <input {...depositRegister('escrowAccount')} className='w-full' />
          {depositErrors.escrowAccount && (
            <p className='text-red-600'>
              {depositErrors.escrowAccount.message}
            </p>
          )}
        </div>

        <div>
          <label>Deposit Amount</label>
          <input {...depositRegister('depositAmount')} className='w-full' />
          {depositErrors.depositAmount && (
            <p className='text-red-600'>
              {depositErrors.depositAmount.message}
            </p>
          )}
        </div>

        <button disabled={isDepositing} className='btn-primary'>
          {isDepositing ? 'Depositing…' : 'Deposit'}
        </button>
      </form>

      {/* completion form */}
      <form onSubmit={completeHandleSubmit(onComplete)} className='space-y-3'>
        <div>
          <label>Escrow Account (to complete)</label>
          <input {...completeRegister('escrowAccount')} className='w-full' />
          {completeErrors.escrowAccount && (
            <p className='text-sm text-red-600'>
              {completeErrors.escrowAccount.message}
            </p>
          )}
        </div>

        <button
          type='submit'
          className='btn-primary'
          disabled={isCompleting || !connected}
        >
          {isCompleting ? 'Completing…' : 'Complete Swap'}
        </button>
      </form>

      {/* cancellation form */}
      <form onSubmit={cancelHandleSubmit(onCancel)} className='space-y-3'>
        <div>
          <label>Escrow Account (to cancel)</label>
          <input {...cancelRegister('escrowAccount')} className='w-full' />
          {cancelErrors.escrowAccount && (
            <p className='text-sm text-red-600'>
              {cancelErrors.escrowAccount.message}
            </p>
          )}
        </div>

        <button
          type='submit'
          className='btn-danger'
          disabled={isCancelling || !connected}
        >
          {isCancelling ? 'Cancelling…' : 'Cancel Escrow'}
        </button>
      </form>
    </div>
  );
}
