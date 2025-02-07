import { compileFile } from 'cashc/dist/index.js';
import {
  TransactionBuilder,
  Contract,
  SignatureTemplate,  
  ElectrumNetworkProvider
// } from 'cashscript';
} from './cashscript/packages/cashscript/dist/index.js';
import {
  hexToBin,
  binToHex,
  cashAddressToLockingBytecode
} from '@bitauth/libauth';

import { alicePriv, aliceAddress, alicePkh } from './common-js.js';
const artifactRegistry = compileFile(new URL('./contracts/Registry.cash', import.meta.url));
const artifactAuction = compileFile(new URL('./contracts/Auction.cash', import.meta.url));

const provider = new ElectrumNetworkProvider();
const addressType = 'p2sh32';
const options = { provider, addressType }

const aliceTemplate = new SignatureTemplate(alicePriv);

const domainCategory = 'cc91626c67661ca9001ab2abbec384ead8b43e8c0daadd96aa623ca023effc9d'
const reverseDomainTokenCategory = binToHex(hexToBin(domainCategory).reverse())

const registryContract = new Contract(artifactRegistry, [reverseDomainTokenCategory], options);

const auctionContract = new Contract(artifactAuction, [], options);
const auctionLockingBytecode = cashAddressToLockingBytecode(auctionContract.address)
const auctionLockingBytecodeHex = binToHex(auctionLockingBytecode.bytecode)

const nameHex = Buffer.from('test').toString('hex')
console.log('INFO: nameHex', nameHex)
const name = hexToBin(nameHex)

console.log('INFO: aliceAddress', aliceAddress)
console.log("let domainTokenCategory = '", domainCategory + "';")
console.log("let registryContractAddress = '", registryContract.address + "';")
console.log("let auctionContractAddress = '", auctionContract.address + "';")
console.log("let auctionLockingBytecode = '", auctionLockingBytecodeHex + "';")


const getUtxos = async () => {
  const userUTXOs = await provider.getUtxos(aliceAddress)
  const registryUTXOs = await provider.getUtxos(registryContract.address)
  const auctionUTXOs = await provider.getUtxos(auctionContract.address)

  return {
    userUTXOs,
    registryUTXOs,
    auctionUTXOs
  }
}

const auction = async () => {
  const currentBlock = await provider.getBlockHeight()

  console.log('INFO: currentBlock', currentBlock)

  const { userUTXOs, registryUTXOs, auctionUTXOs } = await getUtxos()

  const userUTXO = userUTXOs.find(utxo => !utxo.token && utxo.satoshis > 4000);
  if (!userUTXO) throw new Error('Could not find user UTXO without token');

  console.log('INFO: userUTXO', userUTXO)

  // The necessary UTXO to be used from the auction contract
  const auctionContractUTXO = auctionUTXOs[0]

  console.log('INFO: auctionContractUTXO', auctionContractUTXO)
  if(!auctionContractUTXO) throw new Error('Could not find auction contract UTXO');

  // Utxo from registry contract that has auctionContract's lockingbytecode in the nftCommitment
  const threadNFTUTXO = registryUTXOs.find(utxo => 
    utxo.token?.nft?.commitment === auctionLockingBytecodeHex &&
    utxo.token?.nft?.capability === 'none' &&
    utxo.token?.category === domainCategory
  );

  console.log('INFO: threadNFTUTXO', threadNFTUTXO)
  console.log('INFO: registryUTXOs', registryUTXOs)

  // // Registration NFT UTXO from registry contract
  const registrationCounterUTXO = registryUTXOs.find(utxo => 
    utxo.token?.nft?.capability === 'minting' &&
    utxo.token?.category === domainCategory &&
    utxo.token?.nft?.commitment === '0000000000000000' &&
    utxo.token?.amount > 0
  );

  console.log('INFO: registrationCounterUTXO', registrationCounterUTXO)

  if (!threadNFTUTXO) throw new Error('Could not find auctionThreadNFT with matching commitment');
  if (!registrationCounterUTXO) throw new Error('Could not find counter UTXO with minting capability');

  let newRegistrationId = parseInt(registrationCounterUTXO.token.nft.commitment, 16) + 1
  newRegistrationId = newRegistrationId.toString(16).padStart(16, '0')


  const transaction = await new TransactionBuilder({ provider })
  .addInput(threadNFTUTXO, registryContract.unlock.call())
  .addInput(auctionContractUTXO, auctionContract.unlock.call(name))
  .addInput(registrationCounterUTXO, registryContract.unlock.call())
  .addInput(userUTXO, aliceTemplate.unlockP2PKH())
  .addOutput({
    to: registryContract.tokenAddress,
    amount: threadNFTUTXO.satoshis,
    token: {
      category: threadNFTUTXO.token.category,
      amount: threadNFTUTXO.token.amount,
      nft: {
        capability: threadNFTUTXO.token.nft.capability,
        commitment: threadNFTUTXO.token.nft.commitment
      }
    }
  })
  .addOutput({
    to: auctionContract.tokenAddress,
    amount: auctionContractUTXO.satoshis
  })
  .addOutput({
    to: registryContract.tokenAddress,
    amount: registrationCounterUTXO.satoshis,
    token: {
      category: registrationCounterUTXO.token.category,
      amount: registrationCounterUTXO.token.amount  - BigInt(1),
      nft: {
        capability: registrationCounterUTXO.token.nft.capability,
        commitment: newRegistrationId
      }
    }
  })
  .addOutput({
    to: registryContract.tokenAddress,
    amount: BigInt(1000),
    token: {
      category: registrationCounterUTXO.token.category,
      amount: BigInt(1),
      nft: {
        capability: 'mutable',
        commitment: binToHex(alicePkh) + binToHex(name)
      }
    }
  })
  .addOpReturnOutput(['test'])
  .addOutput({
    to: aliceAddress,
    amount: userUTXO.satoshis - BigInt(3300),
  })
  .send();

  console.log('INFO: transaction', transaction)
}


const main = async () => {
  await auction()
}

main()