export default {
	'contractName': 'Domain',
	'constructorInputs': [
		{
			'name': 'inactivityExpiryTime',
			'type': 'int',
		},
		{
			'name': 'name',
			'type': 'bytes',
		},
		{
			'name': 'domainCategory',
			'type': 'bytes',
		},
	],
	'abi': [
		{
			'name': 'useAuth',
			'inputs': [
				{
					'name': 'authID',
					'type': 'int',
				},
			],
		},
		{
			'name': 'burn',
			'inputs': [],
		},
	],
	'bytecode': 'OP_3 OP_PICK OP_0 OP_NUMEQUAL OP_IF OP_INPUTINDEX OP_UTXOBYTECODE OP_INPUTINDEX OP_OUTPUTBYTECODE OP_EQUALVERIFY OP_INPUTINDEX OP_UTXOTOKENCATEGORY OP_3 OP_PICK OP_EQUALVERIFY OP_INPUTINDEX OP_OUTPUTTOKENCATEGORY OP_3 OP_PICK OP_EQUALVERIFY OP_INPUTINDEX OP_UTXOTOKENCOMMITMENT OP_INPUTINDEX OP_OUTPUTTOKENCOMMITMENT OP_EQUALVERIFY OP_4 OP_ROLL OP_1 OP_NUMEQUAL OP_IF OP_INPUTINDEX OP_1ADD OP_UTXOTOKENCATEGORY OP_3 OP_PICK OP_EQUALVERIFY OP_INPUTINDEX OP_1ADD OP_UTXOTOKENCOMMITMENT OP_8 OP_SPLIT OP_DUP OP_4 OP_PICK OP_EQUALVERIFY OP_INPUTINDEX OP_UTXOTOKENCOMMITMENT OP_2 OP_PICK OP_EQUALVERIFY OP_2DROP OP_ELSE OP_INPUTINDEX OP_UTXOTOKENCOMMITMENT OP_0 OP_EQUALVERIFY OP_ENDIF OP_2DROP OP_2DROP OP_1 OP_ELSE OP_3 OP_ROLL OP_1 OP_NUMEQUALVERIFY OP_TXVERSION OP_2 OP_NUMEQUALVERIFY OP_TXINPUTCOUNT OP_3 OP_NUMEQUALVERIFY OP_TXOUTPUTCOUNT OP_1 OP_NUMEQUALVERIFY OP_2 OP_UTXOTOKENCATEGORY OP_0 OP_EQUAL OP_IF OP_1 OP_INPUTSEQUENCENUMBER OP_OVER OP_NUMEQUALVERIFY OP_ELSE OP_2 OP_UTXOTOKENCATEGORY OP_3 OP_PICK OP_EQUALVERIFY OP_2 OP_UTXOTOKENCOMMITMENT OP_8 OP_SPLIT OP_DROP OP_0 OP_UTXOTOKENCOMMITMENT OP_EQUALVERIFY OP_ENDIF OP_INPUTINDEX OP_UTXOBYTECODE OP_0 OP_UTXOBYTECODE OP_OVER OP_EQUALVERIFY OP_1 OP_UTXOBYTECODE OP_EQUALVERIFY OP_0 OP_UTXOTOKENCOMMITMENT OP_0 OP_EQUALVERIFY OP_0 OP_UTXOTOKENCATEGORY OP_1 OP_UTXOTOKENCATEGORY OP_EQUALVERIFY OP_0 OP_UTXOTOKENCATEGORY OP_3 OP_PICK OP_EQUALVERIFY OP_1 OP_UTXOTOKENCATEGORY OP_3 OP_ROLL OP_EQUALVERIFY OP_0 OP_OUTPUTTOKENCATEGORY OP_0 OP_EQUAL OP_NIP OP_NIP OP_ENDIF',
	'source': 'pragma cashscript ^0.11.0;\n\n/**\n * @param inactivityExpiryTime The time period after which the domain is considered inactive.\n * @param name The name of the domain.\n * @param domainCategory The category of the domain.\n */\ncontract Domain(\n  int inactivityExpiryTime,\n  bytes name,\n  bytes domainCategory\n  ) {\n  \n  /**\n   * This function can be used to perform a variety of actions.\n   *\n   * For example:\n   * - It can be used to prove the the ownership of the domain by other contracts.\n   * - This function allows the owner to perform any actions in conjunction with other contracts.\n   * - This function can be used to add records and invalidate multiple records in a single transaction.\n   *\n   * Records are created using OP_RETURN outputs. To add a record, include the record data directly in the OP_RETURN output.\n   * To invalidate a record, prefix "RMV" followed by the hash of the record content in the OP_RETURN output. This will signal\n   * the library/indexers to exclude the record from the valid records.\n   * \n   * @inputs\n   * - Inputx: Internal/External Auth NFT\n   * - Inputx+1 (optional): Domain ownership NFT from the owner\n   * \n   * @outputs\n   * - Outputx: Internal/External Auth NFT returned to this contract\n   * - Outputx+1 (optional): Domain NFT returned\n   * \n   */\n  function useAuth(int authID) {\n    // The activeInputIndex can be anything as long as the utxo properties are preserved and comes back to the\n    // contract without alteration.\n    require(tx.inputs[this.activeInputIndex].lockingBytecode == tx.outputs[this.activeInputIndex].lockingBytecode);\n    require(tx.inputs[this.activeInputIndex].tokenCategory == domainCategory);\n    require(tx.outputs[this.activeInputIndex].tokenCategory == domainCategory);\n    require(tx.inputs[this.activeInputIndex].nftCommitment == tx.outputs[this.activeInputIndex].nftCommitment);\n\n    if(authID == 1) {\n      // The next input from the InternalAuthNFT must be the ownershipNFT.\n      require(tx.inputs[this.activeInputIndex + 1].tokenCategory == domainCategory);\n      bytes registrationId, bytes nameFromOwnerNFT = tx.inputs[this.activeInputIndex + 1].nftCommitment.split(8);\n      require(nameFromOwnerNFT == name);\n      require(tx.inputs[this.activeInputIndex].nftCommitment == registrationId);\n    } else {\n      // One known use of ExternalAuthNFT in the `DomainOwnershipGuard` contract. ExternalAuthNFT is\n      // used to prove that an owner exists.\n      require(tx.inputs[this.activeInputIndex].nftCommitment == 0x);\n    }\n  }\n\n  /**\n   * If the incentive system fails, i.e `DomainOwnershipGuard` or `AuctionConflictResolver` fails to prevent a\n   * a owner conflict. When this happens there will be > 1 owner for this domain.\n   * The owner with the lowest registrationID must be the only owner for this domain.\n   * To help enforce this rule, this function will allow anyone to burn both the Auth NFTs of the NEW owner.\n   *\n   * @inputs\n   * - Input0: Valid External Auth NFT from self\n   * - Input1: Valid Internal Auth NFT from self\n   * - Input2: Invalid External Auth NFT from self\n   * - Input3: Invalid Internal Auth NFT from self\n   * - Input4: BCH input from anyone\n   * \n   * @outputs  \n   * - Output0: Valid External Auth NFT back to self\n   * - Output1: Valid Internal Auth NFT back to self\n   * - Output3: BCH change output\n   */\n  // function resolveOwnerConflict(){\n  //   require(tx.inputs.length == 5);\n  //   require(tx.outputs.length == 3);\n\n  //   // Pure BCH input and output to fund the transaction\n  //   require(tx.inputs[4].tokenCategory == 0x);\n  //   require(tx.outputs[2].tokenCategory == 0x);\n\n  //   bytes selfLockingBytecode = tx.inputs[this.activeInputIndex].lockingBytecode;\n  //   require(tx.inputs[0].lockingBytecode == selfLockingBytecode);\n  //   require(tx.inputs[1].lockingBytecode == selfLockingBytecode);\n  //   require(tx.inputs[2].lockingBytecode == selfLockingBytecode);\n  //   require(tx.inputs[3].lockingBytecode == selfLockingBytecode);\n\n  //   require(tx.outputs[0].lockingBytecode == selfLockingBytecode);\n  //   require(tx.outputs[1].lockingBytecode == selfLockingBytecode);\n\n  //   // External Auth NFTs\n  //   require(tx.inputs[0].nftCommitment == 0x);\n  //   require(tx.inputs[2].nftCommitment == 0x);\n\n  //   // Commitments of Valid Auth NFts back to self\n  //   require(tx.outputs[0].nftCommitment == 0x);\n  //   require(tx.outputs[1].nftCommitment == tx.inputs[1].nftCommitment);\n\n  //   // Ensure that all the token inputs and outputs have domainCategory\n  //   require(tx.inputs[0].tokenCategory == domainCategory);\n  //   require(tx.inputs[1].tokenCategory == domainCategory);\n  //   require(tx.inputs[2].tokenCategory == domainCategory);\n  //   require(tx.inputs[3].tokenCategory == domainCategory);\n\n  //   require(tx.outputs[0].tokenCategory == domainCategory);\n  //   require(tx.outputs[1].tokenCategory == domainCategory);\n\n  //   // Compare the registrationID\n  //   require(int(tx.inputs[1].nftCommitment.reverse()) < int(tx.inputs[3].nftCommitment.reverse()));\n  // }\n\n  /**\n   * Allows the domain owner or anyone to burn the InternalAuthNFT and externalAuthNFT making this domain available\n   * for auction.\n   * \n   * - Owner can burn the AuthNFTs anytime.\n   * - External party can burn the AuthNFTs when the internalAuth NFT has not been used for more than `inactivityExpiryTime`.\n   *\n   * @inputs\n   * - Input0: External Auth NFT\n   * - Input1: Internal Auth NFT\n   * - Input2: Pure BCH or Domain ownership NFT from the owner\n   *\n   * @outputs \n   * - Output0: BCH change\n   *\n   */\n  function burn() {\n    require(tx.version == 2);\n    require(tx.inputs.length == 3);\n    require(tx.outputs.length == 1);\n\n    // If an external party is attempting to burn the authNFTs\n    if (tx.inputs[2].tokenCategory == 0x) {\n      // If pure BCH input, then allow anyone to burn given the time limit has passed.\n      require(tx.inputs[1].sequenceNumber == inactivityExpiryTime);\n    } else {\n      // If domain ownership NFT input, then allow the owner to burn anytime.\n      require(tx.inputs[2].tokenCategory == domainCategory);\n      // Make sure that the registrationID in the domainOwnershipNFT and the internalAuthNFT are the same.\n      require(tx.inputs[2].nftCommitment.split(8)[0] == tx.inputs[0].nftCommitment);\n    }\n\n    bytes selfLockingBytecode = tx.inputs[this.activeInputIndex].lockingBytecode;\n    require(tx.inputs[0].lockingBytecode == selfLockingBytecode);\n    require(tx.inputs[1].lockingBytecode == selfLockingBytecode);\n\n    // ExternalAuthNFT\n    require(tx.inputs[0].nftCommitment == 0x);\n    // Both InternalAuthNFT and externalAuthNFT are immutable and have the same tokenCategory\n    require(tx.inputs[0].tokenCategory == tx.inputs[1].tokenCategory);\n    require(tx.inputs[0].tokenCategory == domainCategory);\n    require(tx.inputs[1].tokenCategory == domainCategory);\n\n    // Return the BCH as change.\n    require(tx.outputs[0].tokenCategory == 0x);\n  }\n}\n',
	'debug': {
		'bytecode': '5379009c63c0c7c0cd88c0ce537988c0d1537988c0cfc0d288547a519c63c08bce537988c08bcf587f76547988c0cf5279886d67c0cf0088686d6d5167537a519dc2529dc3539dc4519d52ce00876351cb789d6752ce53798852cf587f7500cf8868c0c700c7788851c78800cf008800ce51ce8800ce53798851ce537a8800d10087777768',
		'sourceMap': '35:2:54:3;;;;;38:22:38:43;:12::60:1;:75::96:0;:64::113:1;:4::115;39:22:39:43:0;:12::58:1;:62::76:0;;:4::78:1;40:23:40:44:0;:12::59:1;:63::77:0;;:4::79:1;41:22:41:43:0;:12::58:1;:73::94:0;:62::109:1;:4::111;43:7:43:13:0;;:17::18;:7:::1;:20:49:5:0;45:24:45:45;:::49:1;:14::64;:68::82:0;;:6::84:1;46:63:46::0;:::88:1;:53::103;:110::111:0;:53::112:1;47:14:47:30:0;:34::38;;:6::40:1;48:24:48:45:0;:14::60:1;:64::78:0;;:6::80:1;43:20:49:5;49:11:53::0;52:24:52:45;:14::60:1;:64::66:0;:6::68:1;49:11:53:5;35:2:54:3;;;;128::157::0;;;;129:12:129:22;:26::27;:4::29:1;130:12:130:28:0;:32::33;:4::35:1;131:12:131:29:0;:33::34;:4::36:1;134:18:134:19:0;:8::34:1;:38::40:0;:8:::1;:42:137:5:0;136:24:136:25;:14::41:1;:45::65:0;:6::67:1;137:11:142:5:0;139:24:139:25;:14::40:1;:44::58:0;;:6::60:1;141:24:141:25:0;:14::40:1;:47::48:0;:14::49:1;:::52;:66::67:0;:56::82:1;:6::84;137:11:142:5;144:42:144:63:0;:32::80:1;145:22:145:23:0;:12::40:1;:44::63:0;:4::65:1;146:22:146:23:0;:12::40:1;:4::65;149:22:149:23:0;:12::38:1;:42::44:0;:4::46:1;151:22:151:23:0;:12::38:1;:52::53:0;:42::68:1;:4::70;152:22:152:23:0;:12::38:1;:42::56:0;;:4::58:1;153:22:153:23:0;:12::38:1;:42::56:0;;:4::58:1;156:23:156:24:0;:12::39:1;:43::45:0;:12:::1;128:2:157:3;;8:0:158:1',
		'logs': [],
		'requires': [
			{
				'ip': 12,
				'line': 38,
			},
			{
				'ip': 17,
				'line': 39,
			},
			{
				'ip': 22,
				'line': 40,
			},
			{
				'ip': 27,
				'line': 41,
			},
			{
				'ip': 38,
				'line': 45,
			},
			{
				'ip': 47,
				'line': 47,
			},
			{
				'ip': 52,
				'line': 48,
			},
			{
				'ip': 58,
				'line': 52,
			},
			{
				'ip': 70,
				'line': 129,
			},
			{
				'ip': 73,
				'line': 130,
			},
			{
				'ip': 76,
				'line': 131,
			},
			{
				'ip': 85,
				'line': 136,
			},
			{
				'ip': 91,
				'line': 139,
			},
			{
				'ip': 99,
				'line': 141,
			},
			{
				'ip': 106,
				'line': 145,
			},
			{
				'ip': 109,
				'line': 146,
			},
			{
				'ip': 113,
				'line': 149,
			},
			{
				'ip': 118,
				'line': 151,
			},
			{
				'ip': 123,
				'line': 152,
			},
			{
				'ip': 128,
				'line': 153,
			},
			{
				'ip': 133,
				'line': 156,
			},
		],
	},
	'compiler': {
		'name': 'cashc',
		'version': '0.11.0-next.4',
	},
	'updatedAt': '2025-05-08T11:04:04.972Z',
};
