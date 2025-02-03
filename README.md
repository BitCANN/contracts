# BitCANN
Bitcoin Cash for Assigned Names and Numbers

### Features

- Decentralised domain names like `.sat` and `.bch`
- Add/Remove records, currency addresses, text records, social, email and custom records
- No expiry/ No renewals
- NFT domains, domain ownership is an NFT, providing proof of ownership and enabling secondary market trading.
- Hidden name during auction. Ensures privacy, fair price discovery and reduces squatting.
- Earn by protecting the system by
   - Report invalid registrations
   - Identify registration conflicts
   - Proving domain violations
- Possible to sign-In using your identity
- Indexer needed only for heavy usage apps/services

## Table of Contents
1. [Contracts](#contracts)
   - [Registration](#registry-contract)
   - [RegistrationAuction](#registrationauction)
   - [Bid](#bid)
   - [RevealName](#revealname)
   - [DomainFactory](#domainfactory)
   - [Domain](#domain)
   - [ProveInvalidDomain](#proveinvaliddomain)
   - [IllegalRegistration](#illegalregistration)
   - [RegistrationConflict](#registrationconflict)
2. [FAQs](#faqs)
   - [How are the domains sold?](#how-are-the-domains-sold)
   - [How gets the money from auction?](#how-gets-the-money-from-auction)
   - [Are the names revealed upfront?](#are-the-names-revealed-upfront)
   - [When is the name revealed?](#when-is-the-name-revealed)
   - [What type of names does it support?](#what-type-of-names-does-it-support)
   - [How is the correctness of the name verified?](#how-is-the-correctness-of-the-name-verified)
   - [How are auctions created?](#how-are-auctions-created)
   - [What if two auctions from the same name are running?](#what-if-two-auctions-from-the-same-name-are-running)
   - [I won the bidding contest, how do I claim the domain?](#i-won-the-bidding-contest-how-do-i-claim-the-domain)
   - [Why heartbeat?](#why-heartbeat)
   - [Why has ID+heartBeat NFT in the domain contract?](#why-has-idheartbeat-nft-in-the-domain-contract)
   - [An illegal registration auction has started for a domain that is owner by someone, will there be two owners?](#an-illegal-registration-auction-has-started-for-a-domain-that-is-owner-by-someone-will-there-be-two-owners)
   - [Can a bid be cancelled?](#can-a-bid-be-cancelled)
   - [What consists of the ownership NFT?](#what-consists-of-the-ownership-nft)
   - [What happens if they renounce ownership?](#what-happens-if-they-renounce-ownership)
   - [How will any party initiate the auction?](#how-will-any-party-initiate-the-auction)
   - [What is a heartbeatNFT?](#what-is-a-heartbeatnft)
   - [What is Registration Counter NFT?](#what-is-registration-counter-nft)
   - [What is Registration Pair NFTs?](#what-is-registration-pair-nfts)
   - [How are other contracts dealing with the Registry Contract?](#how-are-other-contracts-dealing-with-the-registry-contract)
   - [What is the structure of the Domain contract?](#what-is-the-structure-of-the-domain-contract)
   - [What type of record can be added?](#what-type-of-record-can-be-added)


### Contracts

There are a total of 9 contracts. All contracts are static for a top-level domain (TLD), except for the Domain contract which is unique for each registered name.

The Registry contract acts as the central hub. Each authorized contract can only execute transactions in conjunction with the Registry contract. This creates a star-like structure where:

- The Registry contract is at the center, holding immutable NFTs that contain the lockingBytecodes of authorized contracts and auction pair NFTs
- Every transaction must include both the Registry contract's NFT and exactly one authorized contract's UTXO
- The Registry contract validates the transaction structure, NFT handling, and timelock requirements
- Only contracts whose lockingBytecodes are stored in the Registry's immutable NFTs can participate
- Multiple copies of NFTs enable parallel processing through multiple threads for most contracts

#### Registry Contract

The Registry contract serves as the core authorization and coordination mechanism. It:
- Holds multiple immutable NFTs containing lockingBytecodes of authorized contracts
- Holds Registration Auction NFT pair.

Transaction Structure:
| # | Inputs | Outputs |
|---|--------|---------|
| 0 | Registry contract's immutable NFT | Registry contract's NFT returned unchanged |
| 1 | Authorized contract's UTXO | Authorized contract's UTXO returned unchanged |

Note: The actual number and structure of inputs/outputs and covanents beyond this pair is controlled by the authorized contract being used.

Each authorized contract has a designated number of threads:
- RegistrationAuction: 1 thread (single-threaded registration)
- Bid: ~5 threads
- RegistrationConflict: ~5 threads  
- DomainFactory: ~5 threads
- ProveInvalidDomain: ~5 threads
- IllegalRegistration: ~5 threads
- RegistrationConflict: ~5 threads
- RevealName: ~5 threads


#### RegistrationAuction

   The RegistrationAuction contract starts a new domain registration auctions. Each auction requires:
   - A minimum starting bid of atleast 0.025 BCH
   - Runs for 144 blocks (~1 day), extended by 72 blocks if bid made near end (i.e less than 72 blocks were remaining)
   - Creates two NFT pairs to track the auction state:
     1. Immutable NFT containing registrationId (8 bytes) + nameHash (32 bytes). The satoshis held by this NFT is the bid value.
     2. Mutable NFT containing registrationId (8 bytes) + registrationAuctionEndBlock (4 bytes) + bidderLockingytecode (25 bytes) + isNameRevealed flag (1 byte)

   Transaction Structure:
   | # | Inputs | Outputs |
   |---|--------|---------|
   | 0 | Registry Contract's immutable NFT with commitment that has the lockingBytecode of this contract | Registry Contract's immutable NFT back to the Registry contract |
   | 1 | Any input from this contract | Input1 back to this contract without any change |
   | 2 | Counter NFT from Registry contract (Increases the registrationId by 1 in the output) | Counter NFT going back to the Registry contract |
   | 3 | Funding UTXO | RegistrationPair0 to the Registry contract |
   | 4 | | RegistrationPair1 to the Registry contract |
   | 5 | | Optional change in BCH |


### FAQs

#### How are the domains sold?
Auction, the auction starts with 0.025 BCH as the starting about, any new bid must be 5% higher than the previous bid. By default, the auction ends in 144 blocks (i.e 1 day) but if any new bid is added the auction is extended further by 72 blocks. However, if the auction has > 72 blocks left then no changes to the deadline are made.

#### How gets the money from auction?
For the first 2 years, the split if 50% to miners and 50% to the development team after which it's 100% assigned to miners.

#### Are the names revealed upfront?
No, the auction begins by the interested party providing a hash256(name) which is 32 bytes. Only the interested parties in the domain can know by hashing the name they desire.

#### When is the name revealed?
The names are revealed when the auction ends, anyone or the winning bidder can make a transaction revealing the name in an OP_RETURN.

#### What type of names does it support?
- Letters (a-z or A-Z)
- Numbers (0-9)
- Hyphens (-)

#### How is the correctness of the name verified?
Once the name is revealed the bidder has to wait atleast 2 blocks to claim the domain. This interval provide an opportinity to anyone how can prove that the domain is invalid by providing the name and index of the invalid character. If the name is indeed invalid, the funds are transfered to the party who proved the name to be invalid as reward for keep in system in check. `proveDomainInvalid`

#### How are auctions created?
The creation of auction is single-threaded i.e a single NFT with minting capaility is used to create new auctions, each new auction is given an auctionID. For example: If the current value of the NFT's commitment is 7 then any new auction that is created will have the auctionID of 8. Along with the minting NFT, 2 more NFTs are issued as part of the auction creation process.
part0: auctionID(8 bytes) + nameHash(32 bytes) + value(0.025 BCH)
part1: auctionID(8 bytes) + auctionEndBlock(4 bytes) + bidderLockingBytecode(25 bytes) + isNameRevealed(1 byte)

It is important to understand that the auctionID can also be seen as registrationID, the reasoning for it will be explained later.

#### What if two auctions from the same name are running?
Since auctionIDs increase linearly, the auctionID with the higher number will be considered invalid. Anyone can provide the two competting auctionIDs along with the two pair NFTs and burn the invalidAuction and take away the funds from the invalid auction as a reward for keeping the system in check.

#### I won the bidding contest, how do I claim the domain?
Once you have revealed the name and waited for atleast 2 blocks, you can claim the domain for yourself. Each domain has a unique contract assigned exclusively for itself. When claiming, a new auth + 

#### Why heartbeat?
If the domain has been inactive for > 2 years then the domain is considered as abandoned and anyone can prove the inactivity and burn the auth+heartbeat NFT to make the auction of auction possible.

Permanent domain ownership with a 2-year activity requirement
- Domains are owned permanently as long as owners perform at least one on-chain action in a span of 2 years
- If no activity is detected, the domain becomes eligible for re-auction


#### Why has ID+heartBeat NFT in the domain contract?
why attach auctionID to the auth/heartbeat NFT? because if there comes a time when the domain is
auctioned off again then the ownership 'NFT' still exists somewhere in the real world. This means 
even if the NFT exists. The structure of the ownership NFT is 'auctionID+nameHash' 

Since the Domain contract has the ID+heartbeat NFT and the ownership NFT has the auctionID + nameHash
there are always used together whenever adding or removing records from the Domain contract.

So if the new auction even happens, then the new owner of the domain can burn the previous IDheartbeat NFT so that the previous owner cannot come out of the blue resulting in two conflicting owners. The new owner shall be the real owner of the domain.

#### An illegal registration auction has started for a domain that is owner by someone, will there be two owners?
Anyone can provide the auth+heartbeat NFT form the domain Contract by using the `externalUse` function and prove that the auction is illegal and take away the funds from the auction.


#### Can a bid be cancelled?
No, If a bid it made, it's locked in. Whoever wins the registration auction of the domain can later put it for sale in a secondary market.

#### What consists of the ownership NFT?
It has information in two parts in the NFT commitment, 8 bytes is the registrationID and 32 bytes is the nameHash (Domain name hashed). The capability of the NFT is immutable. Whoever has the NFT has the capability to add or remove records, they can also renounce ownership.

#### What happens if they renounce ownership?
The owner must call the `renounceOwnership` function of their respective Domain contract.
The function will burn the `heartbeat` NFT that exists in the Domain contract and also burn the 
`ownership` NFT that the owner provides when calling this function. This will ensure that a new
auction can be initiated by any other interested party.


#### How will any party initiate the auction?
If a domain is owned by anyone then the Domain contract representing the domain name must have a `heartbeat` NFT, if anyone tries to create an auction for a domain which has that NFT, they can prove it's existance and penalise the illegal auction by taking away the funds in the Bid and burning the illegal auction's Registation Pair NFTs.

So, if no one can provide the heaertbeat NFT that means the auction is valid and can continue to expect more bids and be sold at a later block.

#### What is a heartbeatNFT?

#### What is Registration Counter NFT?
Registration on BCH is a single threaded operation, which means only 1 auction can initiate at a time. So this restricts any parallel activity for registration. The registration contract has a single NFT from the `domainCategory`, let's call it registrationCounter NFT.
This NFT has minting Capability and it acts as storage. It's nftcommitment increases by 1 for each new auction initiated. The NFT commitment is of 8 bytes starting for 0 at the time of genesis.

#### What is Registration Pair NFTs?
When a new registration beings an auction is created, for each auction there can ever be 2 NFTs that exist as a pair. (This pair exists because of the limited space in the NFT commitment i.e 40 bytes).
So the required information is divided into 2 NFTs and they are always used together in a single transaction.

- (Immutable) NFT with registrationId(8 bytes) + nameHash(32 bytes) + satoshivalue attached to the utxo
- (Mutable) NFT with registrationId(8 bytes) + registrationAuctionEndBlock(4 bytes) + bidder's lockingBytecode(25 bytes) + isNameRevealed flag(1 byte)

If the previous registrationID was 0 then in the output the minting counter NFT that belongs to the Registry contract registationID get's incremented by 1.

The registration pair also stats with the registry contract.


#### How are other contracts dealing with the Registry Contract?
1. We already have determined the tokenCategory for this domain system.
2. The registry contract has immutable NFTs that have P2SH lockingBytecode stored as NFTCommitment and have the same tokenCategory as that of the domainCategory.
3. All this happens at the genesis time i.e before the contracts are functional

nftCommitment => (lockingBytecodeP2SH32)

Registry contract says that I don't care how many inputs and outputs are used, as long as my own utxo is the 0th index input and output
and, some contract that has the same lockingbytecode that I have stored in the NFTcommitment of my 0th input.

Let's say the lockingBytecode of the Bid Contract is `abc` then in the genesis if 5 NFTs were created with category the same as domainCategory and their
NFT commitment as `abc` then it's a 5 threaded system which means, 5 transaction can be executed parallely consuming one of these 5 NFTs as the 0th input and 
1st input being the contract that `abc` as it's lockingbytecode.

So in a way registry contract as whitelisted a list of contract that can be execute along with the itself.


Registry Contract also acts as a storage contract


#### What is the structure of the Domain contract?
A domain contract is a 1-of-1, each unique domain has a single owner and a single contract.

#### What type of record can be added?

Anything, the records exists as an OP_RETURN. The owner of the domain makes these 'addRecord' calls. 
The record can be any from DNS configuration to identity, to website, so socials and/or addresses.


#### How to find the records for a domain?
It's as simple as requesting transaction history for an address


#### How to remove records?

[TBD] 
Records are added as OP_RETURN this means that the data is not stored on chain in any UTXO, it will be read by a dedicated indexer. So, in order to remove a record create a transaction from the domain contract mentioning the keyword `RMV` followed by hash160 of the previous OP_RETURN what you would like to remove, the indexers should not include that record. Or `RMV` and complete OP_RETURN what is supposed to be remove. 