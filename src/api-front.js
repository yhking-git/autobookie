const algosdk = require('algosdk');

export const USDC_ASSET_ID_TESTNET = 10458941;
export const USDC_ASSET_ID_MAINNET = 31566704;
export const AlgoSigner = window.AlgoSigner;

const ESCROW_ADDRESS="RMEXYVMWMOFWRNHETIV7HHKEWFPTYOOSCZKNWUWJCQF2PCI34ZFSW6ZBAA"
const ESCROW_MNEMONIC="castle maximum drastic skill purity grace hunt enlist toe quarter cloud cycle army mass secret struggle oxygen tattoo click typical coyote maid tumble absorb under"

// const USER2_ADDRESS="WYEGVAN3QSZLGXMOMKEEVNXIJFVAQTTEBEQ2NRFDPCZ3HHJZKBHGOU7UPU"
// const USER2_MNEMONIC="piece another expect relax practice april thunder sail danger limb magnet rare island walk project claw cook soda life lend come feature grab able absurd"


/**
 * Interface of AlgoSigner
 */
export class AlgoSignerWrapper {
  /**
   * @param {string} ledgerName 
   * @param {number} usdcAssetId 
   * @param {number} fixedFee 
   */
  constructor(ledgerName, usdcAssetId, fixedFee) {
    AlgoSigner.connect();
    this.ledgerName = ledgerName;
    this.usdcAssetId = usdcAssetId;
    this.fixedFee = fixedFee;
    this.client = new algosdk.Algodv2( { 'X-API-Key': 'YOUR API KEY HERE' }, 'https://testnet-algorand.api.purestake.io/ps2', '');
  }

  /**
  * @param {string} address 
  * @param {number} appId 
  */
  async userPrepareBetting(address, appId) {
    console.log("Preparing...");
    const params = await this.#getMinParams();
    console.log("params is ready");
    const txn = algosdk.makeApplicationOptInTxn(address, params, appId);
    console.log("optin txn is made");
    return this.#sendSingleTxn(txn);
  }

  /**
   * @param {string} address
   * @param {number} appId
   * @param {number} amount
   * @param {string} myTeam
   */
  async userBet(address, appId, amount, myTeam) {
    console.log("Betting starting...");
    console.log(`    ${address} is betting on ${myTeam} ${amount} USDC`);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(address, ESCROW_ADDRESS, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(address, params, appId, [new TextEncoder().encode('bet'), new TextEncoder().encode(myTeam)]);
    await this.#sendDoubleTxns(txn0, txn1);
    console.log("Betting complete!");
  }

  /**
   * Claim winnings for a given user.
   * @param {string} address
   * @param {number} appId
   * @param {number} myBet
   * @param {number} myTeamTotal
   * @param {number} otherTeamTotal
   */
  async userClaim(address, appId, myBet, myTeamTotal, otherTeamTotal) {
    const amount = this.#calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal);
    console.log("Claiming " + amount + " with account " + address);
    await this.getAccountAssetInfo(ESCROW_ADDRESS, this.usdcAssetId);
    await this.getAccountAssetInfo(address, this.usdcAssetId);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(ESCROW_ADDRESS, address, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(address, params, appId, [new TextEncoder().encode('claim')]);
    const ESCROW_SK = algosdk.mnemonicToSecretKey(ESCROW_MNEMONIC);
    await this.#sendDoubleTxns(txn0, txn1, ESCROW_SK);
    await this.getAccountAssetInfo(ESCROW_ADDRESS, this.usdcAssetId);
    await this.getAccountAssetInfo(address, this.usdcAssetId);
    console.log("Claim complete!");
  }

  /**
   * Helper function used to calculate how much a user is entitled to if they win for the given parameters.
   * @param {number} myBet 
   * @param {number} myTeamTotal 
   * @param {number} otherTeamTotal 
   * @param {number} fee 
   * @returns {number} The amount a user may claim.
   */
  #calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal) {
    return Math.floor(myBet / myTeamTotal * (myTeamTotal + otherTeamTotal) - this.fixedFee)
  }

  /**
   * Query the blockchain for suggested params, and set flat fee to True and the fee to the minimum.
   */
  async #getMinParams() {
    let suggestedParams = await this.client.getTransactionParams().do();
    console.log(suggestedParams);
    suggestedParams.flatFee  = true;
    suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE;
  
    return suggestedParams
  }

  /**
   * @param {algosdk.Transaction} txn 
   */
  async #sendSingleTxn(txn) {
    const signedTxn = await this.#signSingleTxn(txn);
    const base64Txn = AlgoSigner.encoding.msgpackToBase64(signedTxn);
    await AlgoSigner.send({
      ledger: this.ledgerName,
      tx: base64Txn,
    });
  }

  /**
   * @param {algosdk.Transaction} txn 
   */
  async #signSingleTxn(txn) {
    const binaryTxn = txn.toByte();
    const base64Txn = AlgoSigner.encoding.msgpackToBase64(binaryTxn);
    const signedTxs = await AlgoSigner.signTxn([
      {
          txn: base64Txn,
      }
    ]);

    return signedTxs[0];
  }

  /**
   * @param {algosdk.Transaction} txn0
   * @param {algosdk.Transaction} txn1
   * @param {Uint8Array} sk0
   * @param {Uint8Array} sk1
   */
  async #sendDoubleTxns(txn0, txn1, sk0=undefined, sk1=undefined) {
    const gid = algosdk.computeGroupID([txn0, txn1]);
    txn0.group = gid;
    txn1.group = gid;
    const signedTxn0 = sk0 ? txn0.signTxn(sk0) : await this.#signSingleTxn(txn0);
    const signedTxn1 = sk1 ? txn1.signTxn(sk1) : await this.#signSingleTxn(txn1);
    let combinedBinaryTxns = new Uint8Array(signedTxn0.byteLength + signedTxn1.byteLength);
    combinedBinaryTxns.set(signedTxn0, 0);
    combinedBinaryTxns.set(signedTxn1, signedTxn0.byteLength);
    let combinedBase64Txns = AlgoSigner.encoding.msgpackToBase64(combinedBinaryTxns);
    await AlgoSigner.send({
      ledger: this.ledgerName,
      tx: combinedBase64Txns,
    });
  }

  /**
   * @param {string} from 
   * @param {string} to 
   * @param {number} amount 
   * @param {boolean} closeAtFrom
   * @returns 
   */
  async #makeUsdcTransferTxn(from, to, amount, closeAtFrom=false) {
    return algosdk.makeAssetTransferTxnWithSuggestedParams(
      from,
      to,
      closeAtFrom ? from : undefined,
      undefined,
      amount,
      undefined,
      this.usdcAssetId,
      await this.#getMinParams());
  }
}
