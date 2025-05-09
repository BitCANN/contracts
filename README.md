# @bitcann/contracts

Bitcoin Cash for Assigned Names and Numbers (BitCANN) Smart Contracts

<p align="center">
  <a href="https://www.npmjs.com/package/@bitcann/contracts"><img src="https://img.shields.io/npm/v/@bitcann/contracts.svg" alt="NPM version" /></a>
  <a href="https://codecov.io/github/BitCANN/bitcann-contracts" > 
 <img src="https://codecov.io/github/BitCANN/bitcann-contracts/graph/badge.svg?token=EFOGPCL99P"/> 
 </a><br>
  <a href="https://t.me/bitcann_discussion"><img alt="Join Chat on Telegram" src="https://img.shields.io/badge/chat-BitCANN-0088CC?logo=telegram"></a>
  <a href="https://www.npmjs.com/package/@bitcann/contracts"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@bitcann/contracts"></a>
</p>


## Installation

```bash
npm install @bitcann/contracts
```

## Usage

```javascript
import { BitCANNArtifacts } from '@bitcann/contracts';

// Access contract artifacts
const { Registry, Auction, Domain } = BitCANNArtifacts;
```

---

# Documentation

BitCANN - **Bitcoin Cash for Assigned Names and Numbers** – is a decentralized domain name and identity system built on the Bitcoin Cash Blockchain.

- Decentralized Domain Names like `.sat` and `.bch` and more.
- Add Records, RPA Pay Codes, Add Currency Addresses, Text Records, Custom Records, Social, Email, and more.
- No Renewals or Expiry*
- NFT Domain ownership, enabling secondary market trading.
- Easy lookups
- Sign-In using your Identity
- Plugin for other contract systems
- Earn by protecting the system by:
   - Burning illegal registration attempts
   - Identifying and burning registration conflicts
   - Proving domain violations

## Table of Contents
1. [Contracts](#contracts)
   - [Registry](#registry)
   - [Operational Contracts](#operational-contracts)
      - [Auction](#auction)
      - [Bid](#bid)
      - [DomainFactory](#domainfactory)
   - [Guard Contracts](#guard-contracts)
      - [AuctionNameEnforcer](#auctionnameenforcer)
      - [DomainOwnershipGuard](#domainownershipguard)
      - [AuctionConflictResolver](#auctionconflictresolver)
   - [Domain](#domain)
   - [Accumulator](#accumulator)
2. [Cashtokens](#cashtokens)
   - [RegistrationNFTs](#registrationnfts)
   - [AuctionNFT](#auctionnft)
   - [AuthorizedThreadNFTs](#authorizedthreadnfts)
   - [DomainNFTs](#domainnfts)
3. [TLDs](#tlds)
4. [Genesis](#genesis)
5. [FAQs](#faqs)
   - [How are domains sold?](#how-are-domains-sold)
   - [Who earns from the auction sales?](#who-earns-from-the-auction-sales)
   - [How is the correctness of the name verified?](#how-is-the-correctness-of-the-name-verified)
   - [How are auctions created?](#how-are-auctions-created)
   - [What if two auctions for the same name are running?](#what-if-two-auctions-for-the-same-name-are-running)
   - [I won the bidding contest, how do I claim the domain?](#i-won-the-bidding-contest-how-do-i-claim-the-domain)
   - [Why Internal Auth NFT and External Auth NFT in each Domain Contract?](#why-internal-auth-nft-and-external-auth-nft-in-each-domain-contract)
   - [What if the tokenAmount in the CounterNFT runs out?](#what-if-the-tokenamount-in-the-counternft-runs-out)
   - [An illegal registration auction has started for a domain that is owned by someone, will there be two owners?](#an-illegal-registration-auction-has-started-for-a-domain-that-is-owned-by-someone-will-there-be-two-owners)
   - [Can a bid be cancelled?](#can-a-bid-be-cancelled)
   - [Can anyone renounce ownership of a domain?](#can-anyone-renounce-ownership-of-a-domain)
   - [What happens to the ownershipNFT when the ownership is renounced or the domain is abandoned?](#what-happens-to-the-ownershipnft-when-the-ownership-is-renounced-or-the-domain-is-abandoned)
   - [How do domain or record lookups work?](#how-do-domain-or-record-lookups-work)
   - [How does ownership transfer work?](#how-does-ownership-transfer-work)
   - [How to add records?](#how-to-add-records)
   - [How to remove records?](#how-to-remove-records)
   - [No Renewal or Expiry?](#no-renewal-or-expiry)

## Contracts

![BitCANN Architecture](architecture.png)

The architecture is built around a series of smart contracts, categorized into these main types:

- **Registry Contract**: [Registry.cash](#registry)

- **Operational Contracts**: [Auction.cash](#auction), [Bid.cash](#bid), [DomainFactory.cash](#domainfactory)

- **Guard Contracts**: [AuctionNameEnforcer.cash](#auctionnameenforcer), [DomainOwnershipGuard.cash](#domainownershipguard), [AuctionConflictResolver.cash](#auctionconflictresolver)

- **Domain Contract**: [Domain.cash](#domain)

- **Accumulator Contract**: [Accumulator.cash](#accumulator)


### Registry

The Registry contract functions as the control and storage hub. Operational, Guard, and Accumulator contracts must execute their transactions in conjunction with the Registry contract.
This contract holds [RegistrationNFTs](#registrationnfts), [AuctionNFTs](#auctionnft), and [AuthorizedThreadNFTs](#authorizedthreadnfts).

Constructor:
- `domainCategory`: The category of the domain. All the NFTs in the system belong to this category.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from self | [AuthorizedThreadNFT](#authorizedthreadnfts) back to self + (optionally tokenAmount from auctionNFT input) |
| 1 | Any UTXO from Authorized contract | UTXO back to Authorized contract |

> **Note:** The actual number and structure of inputs/outputs and covenants beyond this pair is controlled by the authorized contract being used.

### Operational Contracts

#### Auction

The Auction contract lets anyone start a new auction.
Each auction requires:
   - A minimum starting bid of at least `minStartingBid` BCH.
   - It runs for at least `minWaitTime`(check [DomainFactory](#domainfactory) contract). The timer resets with a new bid.

Constructor:
- `minStartingBid`: The minimum starting bid of the auction.

Transaction Structure:

Parameters:
- `name`: The name of the domain. This does not include the TLD. [TLDs](#tlds)

| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from [Registry Contract](#registry) | [AuthorizedThreadNFT](#authorizedthreadnfts) back to [Registry Contract](#registry) |
| 1 | Any UTXO from self | Back to self |
| 2 | [RegistrationNFTs](#registrationnfts) Counter NFT | [RegistrationNFTs](#registrationnfts) Counter NFT, with nftCommitment incremented by 1 and tokenAmount decreased by NewRegistrationID |
| 3 | Funding UTXO from bidder | [AuctionNFT](#auctionnft) |
| 4 | | OP_RETURN revealing the name |
| 5 | | Optional change in BCH |


#### Bid

The Bid contract allows anyone to bid on an active auction by allowing restricted manipulation of auctionNFT. It updates the `satoshisValue` and the `pkh` in the `nftCommitment`. The only condition is that the new Bid amount must be at least `minBidIncreasePercentage` higher. Even if the auction is passed the `minWaitTime` and the winning bid has not claimed the domain's ownership, it's still possible to continue bidding which will reset the timer to atleast `minWaitTime`.

Constructor:
- `minBidIncreasePercentage`: The minimum percentage increase in the new bid amount.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from [Registry Contract](#registry) | [AuthorizedThreadNFT](#authorizedthreadnfts) back to [Registry Contract](#registry) |
| 1 | Any UTXO from Authorized contract | UTXO back to Authorized contract |
| 2 | [AuctionNFT](#auctionnft) | [AuctionNFT](#auctionnft) with increased amount and updated commitment |
| 3 | Funding UTXO from new bidder | Previous bid amount returned to previous bidder |
| 4 | | Optional change to new bidder |


#### DomainFactory

The DomainFactory burns the auctionNFT and issues 3 new NFTs [DomainNFTs](#domainnfts). It verifies that the actionNFT input is at least `minWaitTime` old. It also attaches the tokenAmount from auctionNFT to the authorized contract's thread.

Constructor:
- `domainContractBytecode`: The partial bytecode of the domain contract.
- `minWaitTime`: The minimum wait time after which the domain can be claimed by the bidder.
- `maxPlatformFeePercentage`: The maximum fee percentage that can be charged by the platform.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from [Registry Contract](#registry) | [AuthorizedThreadNFT](#authorizedthreadnfts) back to [Registry Contract](#registry) + tokenAmount from auctionNFT input|
| 1 | Any UTXO from self | Back to self |
| 2 | [RegistrationNFT](#registrationnfts) Domain Minting NFT | [RegistrationNFT](#registrationnfts) Domain Minting NFT back to registry contract |
| 3 | [AuctionNFT](#auctionnft) | [DomainNFT](#domainnfts) External Auth NFT |
| 4 | | [DomainNFT](#domainnfts) Internal Auth NFT |
| 5 | | [DomainNFT](#domainnfts) Ownership NFT|
| 6 | | Platform fee and rest to miners |


### Guard Contracts

These contracts serve the purpose of incentivizing the enforcement of the rules. For example, if someone were to start an auction for a domain that is already owned then the [DomainOwnershipGuard](#domainownershipguard) contract will allow anyone to provide proof of ownership of the domain using [External Auth DomainNFT](#domainnfts) and penalize the illegal auction by burning the auctionNFT and giving the funds to the proof provider.

Similarly, other contracts also provide a way to penalize anyone who attempts to break the rules of the system.

#### AuctionNameEnforcer

The AuctionNameEnforcer contract allows anyone to prove that the running auction has an invalid domain name. By providing proof (index of the invalid character) they burn the auctionNFT, taking away the entire amount as a reward.

> **INFO:** The nature of this architecture is that it allows for more types of restrictions. These rules can be modified to allow for more or fewer restrictions.

Rules: 
- The name must consist of only these characters
   - Letters (a-z or A-Z)
   - Numbers (0-9)
   - Hyphens (-)

Transaction Structure:

Parameters:
- `characterNumber`: The index of the character in the name that is invalid (starting from 1)

| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from [Registry Contract](#registry) | [AuthorizedThreadNFT](#authorizedthreadnfts) back to [Registry Contract](#registry) + tokenAmount from auctionNFT input|
| 1 | Any UTXO from self | Back to self |
| 2 | [AuctionNFT](#auctionnft) | Reward output |

> **Important**: Applications must verify that domain name follows the rules before starting an auction. Failing to do so will result in the user losing their bid amount.

#### DomainOwnershipGuard

This prevents registrations for domains that have already been registered and have owners. Anyone can provide proof of valid ownership([External Auth DomainNFT](#domainnfts)) and burn the auctionNFT and claim the funds as a reward.

Constructor:
- `domainContractBytecode`: The partial bytecode of the domain contract.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from [Registry Contract](#registry) | [AuthorizedThreadNFT](#authorizedthreadnfts) back to [Registry Contract](#registry) + tokenAmount from auctionNFT input|
| 1 | Any UTXO from self | Back to self |
| 2 | [DomainNFT](#domainnfts) External Auth NFT | [DomainNFT](#domainnfts) External Auth NFT back to the Domain Contract |
| 3 | [AuctionNFT](#auctionnft) | Reward output |

> **Important**: Applications must verify the presence of External Auth NFT in the Domain Contract before creating a new auction. Failing to do so will result in the user losing their bid amount.

#### AuctionConflictResolver

If two registration auctions exist for the same domain name, the one with the higher registrationID i.e the tokenAmount is invalid. (Since registration is a single-threaded operation such scenarios are unlikely to occur willingly.)

This contract allows anyone to prove that an auction is invalid and burn the invalid auctionNFT in the process and taking away the funds as a reward for keeping the system in check.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from [Registry Contract](#registry) | [AuthorizedThreadNFT](#authorizedthreadnfts) back to [Registry Contract](#registry) + tokenAmount from auctionNFT input|
| 1 | Any UTXO from self | Back to self |
| 2 | Valid [AuctionNFT](#auctionnft) |  Valid [AuctionNFT](#auctionnft) back to Registry Contract |
| 3 | Invalid [AuctionNFT](#auctionnft) | Reward output |

> **Important**: Applications must verify that an auctionNFT with the same name doesn't already exist in the registry contract before creating a new auction.  Failing to do so will result in the user losing their bid amount. BCH's UTXO-based system has no concept of 'Contract Storage' to confirm the existence of an ongoing auction.

### Domain

The Domain contract allows the owner to perform a few operations after [DomainNFTs](#domainnfts) are issued from [DomainFactory](#domainfactory). There exists a unique domain contract for each unique domain name.

Constructor:
- `inactivityExpiryTime`: The time after which the domain is considered abandoned.
- `name`: The name of the domain.
- `domainCategory`: The category of the domain.

There are 3 functions in each Domain Contract:

- **useAuth**: This can be used to perform a variety of actions.
For example:
   - Prove the the ownership of the domain by other contracts.
   - Perform any actions in conjunction with other contracts. (A Lease Contract)
   - Add records and invalidate multiple records in a single transaction.


Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| x | [DomainNFTs](#domainnfts) Internal/External Auth NFT from self | Back to self |
| x+1 (optional) | [OwnershipNFT](#domainnfts) from owner | [OwnershipNFT](#domainnfts) as output |
| x+2 | | OP_RETURN containing record data or removal hash |

- **burn**: This allows the owner of the domain to renounce ownership OR if the domain has been inactive for > `inactivityExpiryTime` then anyone can burn the domain allowing for a new auction.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [DomainNFTs](#domainnfts) Internal Auth NFT | BCH change output |
| 1 | [DomainNFTs](#domainnfts) External Auth NFT | |
| 2 | Pure BCH or [DomainNFTs](#domainnfts) Domain ownership NFT from owner | |

- **resolveOwnerConflict**: Ideally, this function will never be triggered as no one would want to keep the free money on the table by not triggering the transaction that earns them money. Having said that, it's important to have a safeguard for such an unforceable future where these incentive system are unable to catch a registration conflict or burn two competing auctionNFTs for the same name at the same time period resulting in more than 1 owner for a domain. The owner with the lowest registrationID must be the only owner for a domain. To help enforce this rule, this function will allow anyone to burn both the Auth NFTs of the NEW invalid owner.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | Valid External Auth [DomainNFT](#domainnfts) | Valid External Auth [DomainNFT](#domainnfts) back to self |
| 1 | Valid Internal Auth [DomainNFT](#domainnfts) | Valid Internal Auth [DomainNFT](#domainnfts) back to self |
| 2 | Invalid External Auth [DomainNFT](#domainnfts) | BCH change output |
| 3 | Invalid Internal Auth [DomainNFT](#domainnfts) | |
| 4 | BCH input from anyone | |


### Accumulator

Once enough auctions have happened, there might come a time when the counterNFT's tokenAmount is not enough to create new Auction NFT. Since the amount would be accumulating in the thread NFTs, this contract can be used to transfer them back to the CounterNFT to keep the system functioning smoothly.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | [AuthorizedThreadNFT](#authorizedthreadnfts) NFT with authorized contract's locking bytecode as commitment from [Registry Contract](#registry) | [AuthorizedThreadNFT](#authorizedthreadnfts) back to [Registry Contract](#registry) |
| 1 | Any UTXO from self | Back to self |
| 2 | [RegistrationNFTs](#registrationnfts) Counter NFT | [RegistrationNFTs](#registrationnfts) Counter NFT with tokenAmount from input3 |
| 2 | [AuthorizedThreadNFT](#authorizedthreadnfts) Authorized contract's UTXO with tokenAmount | [AuthorizedThreadNFT](#authorizedthreadnfts) without tokenAmount back to [Registry Contract](#registry) |
| 4 | Pure BCH | Change BCH |

---

### Cashtokens

The contracts talk to each other through cashtokens. There are 4 types in this system:
- [RegistrationNFTs](#registrationnfts)
- [AuctionNFT](#auctionnft)
- [AuthorizedThreadNFTs](#authorizedthreadnfts)
- [DomainNFTs](#domainnfts)

#### RegistrationNFTs
A pair of minting NFTs that exist as UTXOs within the [Registry.cash](#registry) contract, consisting of:
   - **CounterNFT**: This minting hybrid NFT has nftCommitment that starts from 0 and increments by 1 with each new registration. It is also initialized with the maximum possible token amount of `9223372036854775807` that interacts with [Auction.cash](#auction) to facilitate the creation of new auction NFTs. Based on the value of the new registrationID from it's own commitment, the new minted AuctionNFT gets the exact tokenAmount. [FAQ](#what-if-the-tokenamount-in-the-counternft-runs-out)
      - `category`: domainCategory
      - `commitment`: registrationID < 8 bytes >
      - `tokenAmount`: Keeps reducing with each new registration.
   - **DomainMintingNFT**: A minting NFT that works with [DomainFactory.cash](#domainfactory) to issue new Domain NFTs. This has no nftCommitment or tokenAmount.
      - `category`: domainCategory

#### AuctionNFT
A mutable hybrid NFT created for each new auction that remains within [Registry.cash](#registry), containing comprehensive auction information through the following attributes:
   - `nftCommitment`: A combination of `bidderPKH< 20 bytes > + name < bytes >`
   - `tokenAmount`: This represents the registrationID
   - `capability`: Mutable
   - `satoshis`: The latest bid amount
   - `category`: The designated domainCategory
   A new bid simply updates the `pkh` in the `nftCommitment` and updates the `satoshisValue` to the new amount.

#### AuthorizedThreadNFTs
Each authorized contract's lockingbytecode(Excluding [Domain.cash](#domain)) is added to an immutable NFT commitment and sent to the [Registry.cash](#registry) at the time of genesis. These immutable NFTs stay with `Registry.cash` forever. Any interaction with the registry must include one of these thread NFTs to create a transaction.

Structure:
   - `category`: domainCategory
   - `commitment`: lockingbytecode of authorized contract <35 bytes>

The Registry Contract has a designated number of threads for authorized contracts:

x = number of threads [The exact value can be anything. It must be decided at the time of genesis as these cannot be created later]

- Auction: ~x threads
- Bid: ~x threads
- DomainFactory: ~x threads
- AuctionNameEnforcer: ~x threads
- DomainOwnershipGuard: ~x threads
- AuctionConflictResolver: ~x threads
- Accumulator: ~x threads

#### DomainNFTs
A set of 3 immutable NFTs minted when an auction ends:
   - **OwnershipNFT**: This NFT proves ownership of a specific domain.
      - `category`: domainCategory
      - `commitment`: registrationID < 8 bytes > + name < bytes >

   - **InternalAuthNFT**: A specialized authorization NFT that resides within the Domain contract and must be used together with the OwnershipNFT to enable the owner's interaction with [Domain.cash](#domain).
      - `category`: domainCategory
      - `commitment`: registrationID < 8 bytes >

   - **ExternalAuthNFT**: A specialized authorization NFT that resides within the Domain Contract but can be attached to any transaction, particularly utilized by [DomainOwnershipGuard.cash](#domainownershipguard) to prove existing domain ownership and enforce penalties on illegal auction attempts.
      - `category`: domainCategory

If the domain has been inactive for > `inactivityExpiryTime` then the domain is considered abandoned and anyone can prove the inactivity and burn the Internal and External Auth NFTs to make the domain available for auction.


## TLDs

Top Level Domains (TLDs) like `.bch` and `.sat` do not exist within the contract system directly as a `value`. The names in the all the NFTs in the system do not have the TLD in them. Instead, it exists in the AuthChain. This is done to allow bigger names and reduce the contract size and complexity.

During the genesis phase, the Registry.cash contract is initialized with the `domainCategory`. The `authHead` for this category must include the symbol and name as the TLD, making it accessible to all applications. This entry will be the first and only one in the `authChain`. After this step, the `authHead` must be permanently removed by creating an OP_RETURN output as the first output.

## Genesis


To ensure the system operates as expected, the following steps must be followed :

- Mint a new hybrid token with an NFT commitment set to 0 (8 bytes) and the maximum possible token amount of `9223372036854775807`, the tokenCategory of this NFT will be `domainCategory`.
- Using the `tokenCategory` i.e domainCategory, create the locking bytecode for `Registry.cash`.
- Mint a mintingNFT i.e `DomainMintingNFT` and send it to the `Registry.cash`
- Determine the following parameters and generate the locking bytecode of all the other authorized contracts:
   - `inactivityExpiryTime`
   - `minWaitTime`
   - `maxPlatformFeePercentage`
   - `minBidIncreasePercentage`
   - `minStartingBid`
   - `domainContractBytecode`
- Create multiple threadNFTs for each authorized contract, commitment of each threadNFT must be the lockingbytecode of the authorized contract and the capability must be immutable.
- Send the threadNFTs to the `Registry.cash`
- Remove the authhead after adding information(Name and Symbol) about the domain in the authchain.

---

## FAQs

#### How are domains sold?
Domains are sold through an auction. The auction starts using the [Auction](#auction) Contract and is open for new Bids from anyone using the [Bid](#bid) contract. Once no new bids have been made for a `minWaitTime` period, the bidder can claim the domain by using the [DomainFactory](#domainfactory) contract.

#### Can a bid be cancelled?
No, Once a bid is made, it's locked in.

#### Who earns from the auction sales?

Since this is an open protocol, the platform facilitating the interaction can attach their own address to get a percentage of the fee. The percentage of the fee is set in the contract parameters of the [DomainFactory](#domainfactory) contract. The can choose to get any percentage less than `maxPlatformFeePercentage`. Remaining funds are sent to the miners.

#### How do domain or record lookups work?
Let's assume there exists a library called `bitcann`. There is how it might look like:

```js
import { getDomain, getRecords } from 'bitcann';

const domain = getDomain('example.bch');
const records = getRecords(domain);
```

- `getDomain()` will return the address of the domain contract.
```js
function getDomain(fullName) {
   const name, tld = fullName.split('.')
   const domainCategory = getCategoryForTLD(tld)
   const domainCategoryReversed = binToHex(hexToBin(domainCategory).reverse())
   const scriptHash = buildLockScriptP2SH32(20 +  domainCategoryReversed + pushDataHex(name) + domainContractBytecode)
   const address = lockScriptToAddress(scriptHash)
   return address
}
```

- `getRecords()` will return the records of the domain. Getting the records is as easy as fetching the transaction history of the domain contract and checking the OP_RETURN outputs.

#### Can anyone renounce ownership of a domain?
Yes, The owner must call the `burn` function of their respective Domain contract. The function will burn the Internal Auth NFT and the External Auth NFT allowing anyone to initiate a new auction for the domain.

#### What happens to the ownershipNFT when the ownership is renounced or the domain is abandoned?
Since the ownershipNFT's first 8 bytes are registrationID, they cannot influence the domain contract as the new internal Auth NFT will have a different registrationID. The existing ownershipNFT renders useless.

#### How does ownership transfer work? 
Ownership transfer is simply transferring the ownershipDomainNFT to the new owner.

#### How to add records?
The owner can add new records using the `addRecord` function of the DomainContract. Records are added as OP_RETURN outputs. Records can be found by checking transaction history.

#### How to remove/invalidate records?

Since the records are OP_RETURN, it's not possible to remove them. However, it's possible to provide a way that can act as a standard for applications to understand that a certain record in invalidated. To 'Invalidate' a record, the owner can create a new transaction from the Domain Contract using the `addRecord` function and provide `RMV + hash` in the OP_RETURN.

#### No Renewal or Expiry?
To prevent domains from being lost indefinitely, the owner must perform at least one activity (such as adding or invalidating records) within the `inactivityExpiryTime` period. Each activity resets the inactivity timer. If the owner does not interact with the domain within the `inactivityExpiryTime`, anyone can burn the Internal and External Auth NFTs to make the domain available for auction.

#### How is the name verified?
Check [AuctionNameEnforcer](#auctionnameenforcer)

#### How are auctions created?
Check [Auction](#auction)

#### What if two auctions for the same name are running?
Check [AuctionConflictResolver](#auctionconflictresolver)

#### I won the bidding contest, how do I claim the domain?
Check [DomainFactory](#domainfactory)

#### Why Internal Auth NFT and External Auth NFT in each Domain Contract?
Check [DomainNFTs](#domainnfts)

#### What if the tokenAmount in the CounterNFT runs out?
Check [Accumulator](#accumulator)

#### An auction has started for a domain that is owned by someone, will there be two owners?
Check [DomainOwnershipGuard](#domainownershipguard)
