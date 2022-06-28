const algosdk = require('algosdk');

export const USDC_ASSET_ID_TESTNET = 10458941;
export const USDC_ASSET_ID_MAINNET = 31566704;
export const AlgoSigner = window.AlgoSigner;

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
  }

  /**
  * @param {string} mnemonic 
  * @param {number} appId 
  */
  async userPrepareBetting(mnemonic, appId) {
    console.log("Prepare Betting starting...");
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const params = await this.#getMinParams();
    const txn = algosdk.makeApplicationOptInTxn(account.addr, params, appId);
    console.log("Prepare Betting complete!");
    return this.#sendSingleTxn(account.sk, txn);
  }

  /**
   * @param {string} mnemonic
   * @param {number} appId
   * @param {number} amount
   * @param {string} myTeam
   * @param {string} escrowAddr
   */
  async userBet(mnemonic, appId, amount, myTeam, escrowAddr) {
    console.log("Betting starting...");
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(`    ${account.addr} is betting on ${myTeam} ${amount} USDC`);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(account.addr, escrowAddr, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(account.addr, params, appId, [new TextEncoder().encode('bet'), new TextEncoder().encode(myTeam)]);
    await this.#sendDoubleTxns(account.sk, txn0, account.sk, txn1);
    console.log("Betting complete!");
  }

  /**
   * Claim winnings for a given user.
   * @param {string} mnemonic
   * @param {number} appId
   * @param {string} escrowAddr
   * @param {string} escrowSk
   * @param {number} myBet
   * @param {number} myTeamTotal
   * @param {number} otherTeamTotal
   */
  async userClaim(mnemonic, appId, escrowAddr, escrowSk, myBet, myTeamTotal, otherTeamTotal) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const amount = this.#calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal);
    console.log("Claiming " + amount + " with account " + account.addr);
    await this.getAccountAssetInfo(escrowAddr, this.usdcAssetId);
    await this.getAccountAssetInfo(account.addr, this.usdcAssetId);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(escrowAddr, account.addr, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(account.addr, params, appId, [new TextEncoder().encode('claim')]);
    await this.#sendDoubleTxns(escrowSk, txn0, account.sk, txn1);
    await this.getAccountAssetInfo(escrowAddr, this.usdcAssetId);
    await this.getAccountAssetInfo(account.addr, this.usdcAssetId);
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
    const suggestedParams = await AlgoSigner.algod({
      ledger: this.ledgerName,
      path: '/v2/transactions/params'
    });
  
    suggestedParams.flatFee  = true;
    suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE;
  
    return suggestedParams
  }

  /**
   * @param {Uint8Array} sk 
   * @param {algosdk.Transaction} txn 
   */
  async #sendSingleTxn(sk, txn) {
    const signedTxn = txn.signTxn(sk);
    const base64Txn = AlgoSigner.encoding.msgpackToBase64(signedTxn);
    await AlgoSigner.send({
      ledger: this.ledgerName,
      tx: base64Txn,
    });
  }

  /**
   * @param {Uint8Array} sk0
   * @param {algosdk.Transaction} txn0
   * @param {Uint8Array} sk1
   * @param {algosdk.Transaction} txn1
   */
  async #sendDoubleTxns(sk0, txn0, sk1, txn1) {
    const gid = algosdk.computeGroupID([txn0, txn1]);
    txn0.group = gid;
    txn1.group = gid;
    const signedTxn0 = txn0.signTxn(sk0);
    const signedTxn1 = txn1.signTxn(sk1);
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
