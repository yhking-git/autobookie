const algosdk = require('algosdk');

export const USDC_ASSET_ID_TESTNET = 10458941;
export const USDC_ASSET_ID_MAINNET = 31566704;
export const AlgoSigner = window.AlgoSigner;

const ESCROW_ADDRESS="RMEXYVMWMOFWRNHETIV7HHKEWFPTYOOSCZKNWUWJCQF2PCI34ZFSW6ZBAA"
const ESCROW_MNEMONIC="castle maximum drastic skill purity grace hunt enlist toe quarter cloud cycle army mass secret struggle oxygen tattoo click typical coyote maid tumble absorb under"


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
    this.client = new algosdk.Algodv2( { 'X-API-Key': 'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc' }, 'https://testnet-algorand.api.purestake.io/ps2', '');
  }

  /**
  * @param {string} address 
  * @param {number} appId 
  */
  async optinApp(address, appId) {
    console.log("Optin App...");
    const params = await this.#getMinParams();
    const txn = algosdk.makeApplicationOptInTxn(address, params, appId);
    await this.#sendSingleTxn(txn);
    console.log("Optin App complete!");
  }

  /**
   * @param {string} address
   * @param {number} appId
   * @param {number} amount
   * @param {string} myTeam
   */
  async bet(address, appId, amount, myTeam) {
    console.log(`${address} is betting on ${myTeam} ${amount} USDC`);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(address, ESCROW_ADDRESS, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(address, params, appId, [new TextEncoder().encode('bet'), new TextEncoder().encode(myTeam)]);
    console.log(`    txn0.txId: ${txn0.txID()}`);
    console.log(`    txn1.txId: ${txn1.txID()}`);
    await this.#sendDoubleTxnsSame(txn0, txn1);
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
  async claim(address, appId, myBet, myTeamTotal, otherTeamTotal) {
    const amount = this.#calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal);
    console.log("Claiming " + amount + " with account " + address);
    await this.getAccountAssetInfo(ESCROW_ADDRESS, this.usdcAssetId);
    await this.getAccountAssetInfo(address, this.usdcAssetId);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(ESCROW_ADDRESS, address, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(address, params, appId, [new TextEncoder().encode('claim')]);
    const escrowAccount = algosdk.mnemonicToSecretKey(ESCROW_MNEMONIC);
    await this.#sendDoubleTxns(txn0, txn1, escrowAccount.sk);
    await this.getAccountAssetInfo(ESCROW_ADDRESS, this.usdcAssetId);
    await this.getAccountAssetInfo(address, this.usdcAssetId);
    console.log("Claim complete!");
  }

  /**
   * Function used to print asset info for account and assetid
   * @param {string} addr 
   * @param {number} assetId 
   */
  async getAccountAssetInfo(addr, assetId) {
    const accountInfo = await this.client.accountInformation(addr).do();
    let assetInfo = {};
    assetInfo['address'] = addr;
    assetInfo['algo'] = accountInfo['amount'];
    for (let idx = 0; idx < accountInfo['assets'].length; idx++) {
        const scrutinizedAsset = accountInfo['assets'][idx];
        if (scrutinizedAsset['asset-id'] === assetId) {
            // let myassetinfo = JSON.stringify(scrutinizedAsset, undefined, 2);
            assetInfo.asset = scrutinizedAsset;
            break;
        }
    }

    console.log("info = " + JSON.stringify(assetInfo, undefined, 2));
    return assetInfo
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
    suggestedParams.flatFee  = true;
    suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE;
  
    return suggestedParams
  }

  /**
   * @param {algosdk.Transaction} txn 
   */
  async #sendSingleTxn(txn) {
    const signedTxn = await this.#signSingleTxn(txn);
    console.log("#sendSingleTxn - signedTxn.txID: " + signedTxn.txID);
    console.log("#sendSingleTxn - signedTxn.blob: " + signedTxn.blob);
    await AlgoSigner.send({
      ledger: this.ledgerName,
      tx: signedTxn.blob,
    });
  }

  /**
   * @param {algosdk.Transaction} txn 
   */
  async #signSingleTxn(txn) {
    console.log("#signSingleTxn - ");
    console.log(`    txn.txId: ${txn.txID()}`);
    const binaryTxn = txn.toByte();
    console.log(`    binaryTxn.byteLength: ${binaryTxn.byteLength}`);
    const base64Txn = AlgoSigner.encoding.msgpackToBase64(binaryTxn);
    const signedTxs = await AlgoSigner.signTxn([
      {
          txn: base64Txn,
      }
    ]);
    console.log("#signSingleTxn - complete!");

    return signedTxs[0];
  }

  /**
   * @param {algosdk.Transaction} txn0
   * @param {algosdk.Transaction} txn1
   * @param {Uint8Array} sk0
   * @param {Uint8Array} sk1
   */
  async #sendDoubleTxnsSame(txn0, txn1) {
    console.log("#sendDoubleTxnsSame - ");
    console.log(`    txn0.txId: ${txn0.txID()}`);
    console.log(`    txn1.txId: ${txn1.txID()}`);

    algosdk.assignGroupID([txn0, txn1]);

    console.log(`    txn0.txId: ${txn0.txID()}`);
    console.log(`    txn1.txId: ${txn1.txID()}`);

    let binaryTxs = [txn0.toByte(), txn1.toByte()];
    let base64Txs = binaryTxs.map((binary) => AlgoSigner.encoding.msgpackToBase64(binary));
    
    let signedTxs = await AlgoSigner.signTxn([
      {
        txn: base64Txs[0],
      },
      {
        txn: base64Txs[1],
      },
    ]);
  
    const signedTxn0Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[0].blob);
    const signedTxn1Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[1].blob);
    let combinedBinaryTxns = new Uint8Array(signedTxn0Binary.byteLength + signedTxn1Binary.byteLength);
    combinedBinaryTxns.set(signedTxn0Binary, 0);
    combinedBinaryTxns.set(signedTxn1Binary, signedTxn0Binary.byteLength);
    let combinedBase64Txns = AlgoSigner.encoding.msgpackToBase64(combinedBinaryTxns);
    
    await AlgoSigner.send({
      ledger: 'TestNet',
      tx: combinedBase64Txns,
    });

    console.log("#sendDoubleTxnsSame - complete!");
  }

  /**
   * @param {algosdk.Transaction} txn0
   * @param {algosdk.Transaction} txn1
   * @param {Uint8Array} sk0
   * @param {Uint8Array} sk1
   */
   async #sendDoubleTxns(txn0, txn1, sk0=undefined, sk1=undefined) {
    console.log("#sendDoubleTxns - ");
    console.log(`    txn0.txId: ${txn0.txID()}`);
    console.log(`    txn1.txId: ${txn1.txID()}`);
    console.log(`    sk0: ${sk0}`);
    console.log(`    sk1: ${sk1}`);

    algosdk.assignGroupID([txn0, txn1]);

    console.log(`    txn0.txId: ${txn0.txID()}`);
    console.log(`    txn1.txId: ${txn1.txID()}`);

    let signedTxn0;
    if (sk0) {
      console.log(` sk0 txn0.txId: ${txn0.txID()}`);
      signedTxn0 = txn0.signTxn(sk0);
    } else {
      console.log(`     txn0.txId: ${txn0.txID()}`);
      signedTxn0 = AlgoSigner.encoding.base64ToMsgpack((await this.#signSingleTxn(txn0)).blob);
    }

    let signedTxn1;
    if (sk1) {
      console.log(` sk1 txn1.txId: ${txn1.txID()}`);
      signedTxn1 = txn1.signTxn(sk1);
    } else {
      console.log(`     txn1.txId: ${txn1.txID()}`);
      signedTxn1 = AlgoSigner.encoding.base64ToMsgpack((await this.#signSingleTxn(txn1)).blob);
    }

    console.log(`    signedTxn0.byteLength: ${signedTxn0.byteLength}`);
    console.log(`    signedTxn1.byteLength: ${signedTxn1.byteLength}`);

    let combinedBinaryTxns = new Uint8Array(signedTxn0.byteLength + signedTxn1.byteLength);
    combinedBinaryTxns.set(signedTxn0, 0);
    combinedBinaryTxns.set(signedTxn1, signedTxn0.byteLength);
    let combinedBase64Txns = AlgoSigner.encoding.msgpackToBase64(combinedBinaryTxns);

    await AlgoSigner.send({
      ledger: this.ledgerName,
      tx: combinedBase64Txns,
    });
    console.log("#sendDoubleTxns - complete!");
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
