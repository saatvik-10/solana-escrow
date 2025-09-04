import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const network = WalletAdapterNetwork.Devnet;

export const connection = new Connection(clusterApiUrl(network), 'confirmed');
