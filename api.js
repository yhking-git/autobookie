const algosdk = require('algosdk');
const prompt = require("prompt-sync")({ sigint: true });
const fs = require('fs');
const {stringToByteArray, numberToByteArray, stringToTimestamp, sleep} = require('./util');

const USDC_ASSET_ID_TESTNET = 10458941;
const USDC_ASSET_ID_MAINNET = 31566704;

class AutobookieDapp {
  /**
   * @param {number} appId 
   * @param {string} creator 
   * @param {{addr: string, sk: Uint8Array, mnemonic: string}} escrow 
   * @param {string} team1 
   * @param {string} team2 
   * @param {number} limitDate 
   * @param {number} endDate 
   */
  constructor(appId, creator, escrow, team1, team2, limitDate, endDate) {
    /** @type {number} */
    this.appId = appId;
    /** @type {string} */
    this.creator = creator;
    /** @type {{addr: string, sk: Uint8Array, mnemonic: string}} */
    this.escrow = escrow;
    /** @type {string} */
    this.team1 = team1;
    /** @type {string} */
    this.team2 = team2;
    /** @type {number} */
    this.limitDate = limitDate;
    /** @type {number} */
    this.endDate = endDate;
    /** @type {string} */
    this.winner = '';
  }
}

/**
 * Interface of Algorand
 */
class AutobookieCore {
  /**
   * @param {string} algoToken 
   * @param {string} algodAddr 
   * @param {number} algodPort 
   * @param {number} usdcAssetId 
   * @param {number} fixedFee 
   */
  constructor(algoToken, algodAddr, algodPort, usdcAssetId, fixedFee) {
    /** @type {algosdk.Algodv2} */
    this.client = new algosdk.Algodv2(algoToken, algodAddr, algodPort);
    /** @type {number} */
    this.usdcAssetId = usdcAssetId;
    this.fixedFee = fixedFee;
  }

  /**
   * @param {string} mnemonic 
   */
  async makeAccoutCanUseUsdc(mnemonic) {
    let account = algosdk.mnemonicToSecretKey(mnemonic);
    let txn = await this.#makeUsdcTransferTxn(account.addr, account.addr, 0);
    await this.#sendSingleTxn(account.sk, txn);
    await this.getAccountAssetInfo(account.addr, this.usdcAssetId);
  }

  /**
   * @param {string} creatorMnemonic 
   * @param {string} escrowMnemonic 
   * @param {string} team1 
   * @param {string} team2 
   * @param {number} limitDate 
   * @param {number} endDate 
   */
  async createDapp(creatorMnemonic, escrowMnemonic, team1, team2, limitDate, endDate) {
    console.log(`Creating DApp... ${limitDate} ~ ${endDate}`);
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    // create dapp
    const args = [stringToByteArray(team1),
                  stringToByteArray(team2),
                  numberToByteArray(limitDate),
                  numberToByteArray(endDate),
                  numberToByteArray(this.fixedFee)          // fee 20 USDC
    ];
    const response = await this.#createApp(5, 4, 1, 1, './teal/approval.teal', './teal/clear.teal', creatorAccount, args);
    console.log('Successfully deployed application: ');
    const appId = response['application-index'];

    // create escrow
    const escrowAccount = algosdk.mnemonicToSecretKey(escrowMnemonic);
    const escrow = {
      addr: escrowAccount.addr,
      sk: escrowAccount.sk,
      mnemonic: algosdk.secretKeyToMnemonic(escrowAccount.sk)
    };
    console.log('escrow = ', escrow);

    // console.log('Funding escrow account');
    // await this.getAccountAssetInfo(escrowAccount.addr, this.usdcAssetId);
    // let txn = algosdk.makePaymentTxnWithSuggestedParams(creatorAccount.addr, escrowAccount.addr, 1000000, undefined, undefined, await this.#getMinParams());
    // await this.#sendSingleTxn(creatorAccount.sk, txn);
    // await this.getAccountAssetInfo(escrowAccount.addr, 0);
    // console.log('Funding escrow account done');

    await this.makeAccoutCanUseUsdc(escrow.mnemonic);
    let dapp = new AutobookieDapp(appId, creatorAccount.addr, escrow, team1, team2, limitDate, endDate);
    await this.setEscrow(creatorMnemonic, dapp);
    console.log('DApp created: ', dapp);
    return dapp;
  }

  /**
   * @param {string} mnemonic
   * @param {AutobookieDapp} dapp
   * @param {number} amount
   * @param {string} myTeam
   */
  async bet(mnemonic, dapp, amount, myTeam) {
    console.log("Betting starting...");
    if (myTeam !== dapp.team1 && myTeam !== dapp.team2) {
      console.log(`Invalid team: ${myTeam}`);
      return;
    }

    if (amount <= this.fixedFee) {
      console.log(`Invalid amount: ${amount}`);
      return;
    }

    const account = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(`    ${account.addr} is betting on ${myTeam} ${amount} USDC`);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(account.addr, dapp.escrow.addr, amount);
    const txn1 = algosdk.makeApplicationOptInTxn(account.addr, params, dapp.appId, [stringToByteArray(myTeam)]);
    await this.#sendDoubleTxns(account.sk, txn0, account.sk, txn1);
    console.log("Betting complete!");
  }

  /**
   * @param {string} mnemonic
   * @param {AutobookieDapp} dapp 
   * @returns {string}
   */
  async setEscrow(mnemonic, dapp) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(`Updating application ${dapp.appId} with escrow address`);
    await this.#callApp(account, dapp.appId, [stringToByteArray('escrow'), algosdk.decodeAddress(dapp.escrow.addr).publicKey]);
    console.log('Successfully updated escrow address:');
  }

  /**
   * @param {string} mnemonic 
   * @param {AutobookieDapp} dapp 
   * @param {string} winner 
   */
  async setWinner(mnemonic, dapp, winner) {
    console.log(`Updating application ${dapp.appId} with winner ${winner}`);
    const now =  Math.round(Date.now()/1000);
    const seconds = dapp.limitDate - now;
    if (seconds > 0) {
      await sleep(seconds + 10);
    }
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const response = await this.#callApp(account, dapp.appId, [stringToByteArray('winner'), stringToByteArray(winner)]);
    console.log("Successfully update application:");
    console.log(response, '\n\n');
  }

  /**
   * Claim winnings for a given user.
   * @param {string} mnemonic
   * @param {AutobookieDapp} dapp
   * @param {number} myBet
   * @param {number} myTeamTotal
   * @param {number} otherTeamTotal
   */
  async claim(mnemonic, dapp, myBet, myTeamTotal, otherTeamTotal) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const amount = this.#calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal);
    console.log("Claiming " + amount + " with account " + account.addr);
    await this.getAccountAssetInfo(dapp.escrow.addr, this.usdcAssetId);
    await this.getAccountAssetInfo(account.addr, this.usdcAssetId);
    const params = await this.#getMinParams();
    let txn0 = await this.#makeUsdcTransferTxn(dapp.escrow.addr, account.addr, amount);
    let txn1 = algosdk.makeApplicationNoOpTxn(account.addr, params, dapp.appId, [stringToByteArray('claim')]);
    await this.#sendDoubleTxns(dapp.escrow.sk, txn0, account.sk, txn1);
    await this.getAccountAssetInfo(dapp.escrow.addr, this.usdcAssetId);
    await this.getAccountAssetInfo(account.addr, this.usdcAssetId);
    console.log("Claim complete!");
  }

  /**
   * @param {string} mnemonic 
   * @param {AutobookieDapp} dapp 
   * @param {boolean} closeOut
   */
  async deleteDappByObject(mnemonic, dapp) {
    console.log('WARNING! This will permenantly delete the application, and any assets left in the escrow address will be unrecoverable!');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    // usdc
    let info = await this.getAccountAssetInfo(dapp.escrow.addr, this.usdcAssetId);
    if (info.asset != undefined && info.asset.amount != undefined && info.asset.amount > 0) {
      let usdcTxn = await this.#makeUsdcTransferTxn(dapp.escrow.addr, account.addr, info.asset.amount);
      await this.#sendSingleTxn(dapp.escrow.sk, usdcTxn);
      info = await this.getAccountAssetInfo(dapp.escrow.addr, this.usdcAssetId);
    }
    // algo
    const params = await this.#getMinParams();
    let txn0 = algosdk.makePaymentTxnWithSuggestedParams(dapp.escrow.addr, account.addr, 0, undefined, undefined, params);
    let txn1 = algosdk.makeApplicationDeleteTxn(account.addr, params, dapp.appId);
    await this.#sendDoubleTxns(dapp.escrow.sk, txn0, account.sk, txn1);
    console.log("Deleted appId: ", dapp.appId);
    console.log('All done!');
  }

  /**
   * @param {string} mnemonic 
   * @param {number} appId 
   * @param {boolean} closeOut
   */
  async deleteDappById(mnemonic, appId) {
    console.log('WARNING! This will permenantly delete the application, and any assets left in the escrow address will be unrecoverable!');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const params = await this.#getMinParams();
    let txn = algosdk.makeApplicationDeleteTxn(account.addr, params, appId);
    const signedTxn = txn.signTxn(account.sk);
    const {txId} = await this.client.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(this.client, txId, 20);
    console.log("Deleted appId: ", appId);
    console.log('All done!');
  }

  /**
   * Function used to print asset info for account and assetid
   * @param {string} addr 
   * @param {number} assetId 
   */
  async getAccountAssetInfo(addr, assetId) {
    let accountInfo = await this.client.accountInformation(addr).do();
    let assetInfo = {};
    assetInfo['address'] = addr;
    assetInfo['algo'] = accountInfo['amount'];
    for (let idx = 0; idx < accountInfo['assets'].length; idx++) {
        let scrutinizedAsset = accountInfo['assets'][idx];
        if (scrutinizedAsset['asset-id'] == assetId) {
            let myassetinfo = JSON.stringify(scrutinizedAsset, undefined, 2);
            assetInfo.asset =scrutinizedAsset;
            break;
        }
    }

    console.log("info = " + JSON.stringify(assetInfo, undefined, 2));
    return assetInfo
  }

  ////////// private methods //////////

  /**
   * @param {string} tealString 
   */
  async #compileTealString(tealString) {
    const src = tealString || '#pragma version 2\nint 1';
    const compiled = await this.client.compile(src).do();
    return new Uint8Array(Buffer.from(compiled.result, 'base64'));
  }

  /**
   * @param {string} fileName 
   */
  async #compileTealFile(fileName) {
    const src = fs.readFileSync(fileName, 'utf8') || '#pragma version 2\nint 1';
    return this.#compileTealString(src);
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
      await this.#getMinParams())
  }

  /**
   * @param {algosdk.Account} account
   * @param {number} appId 
   * @param {Uint8Array[]} args
   */
  async #callApp(account, appId, args=null) {
    const params = await this.#getMinParams();
    const txn = algosdk.makeApplicationNoOpTxn(account.addr, params, appId, args);
    const signedTxn = txn.signTxn(account.sk);
    let txId = txn.txID();
    await this.client.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(this.client, txId, 20)
    const response = await this.client.pendingTransactionInformation(txId).do();

    return response
  }

  /**
   * @param {number} numGlobalInts 
   * @param {number} numGlobalByteSlices 
   * @param {number} numLocalInts 
   * @param {number} numLocalByteSlices 
   * @param {string} approvalProgram 
   * @param {string} clearProgram 
   * @param {alogsdk.Account} account 
   * @param {[]} appArgs 
   * @returns 
   */
  async #createApp(numGlobalInts, numGlobalByteSlices, numLocalInts, numLocalByteSlices, approvalProgram, clearProgram, account, appArgs=null) {
    const params = await this.#getMinParams();
    const txn = algosdk.makeApplicationCreateTxn(
      account.addr,
      params,
      algosdk.OnApplicationComplete.NoOpOC,
      await this.#compileTealFile(approvalProgram),
      await this.#compileTealFile(clearProgram),
      numLocalInts,
      numLocalByteSlices,
      numGlobalInts,
      numGlobalByteSlices,
      appArgs
    );
    const signedTxn = txn.signTxn(account.sk);
    const txId = txn.txID();
    await this.client.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(this.client, txId, 20);
    const transactionResponse = await this.client.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['application-index'];
    console.log("Created new app-id: ",appId);

    return transactionResponse;
  }

  /**
   * @param {Uint8Array} sk 
   * @param {algosdk.Transaction} txn 
   */
  async #sendSingleTxn(sk, txn) {
    const signedTxn = txn.signTxn(sk);
    const txId = txn.txID();
    await this.client.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(this.client, txId, 20);
    return await this.client.pendingTransactionInformation(txId).do();
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
    const {txId} = await this.client.sendRawTransaction([signedTxn0, signedTxn1]).do();
    await algosdk.waitForConfirmation(this.client, txId, 20);
    await this.client.pendingTransactionInformation(txId).do();
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

}

module.exports = {
  AutobookieCore,
  AutobookieDapp,
  USDC_ASSET_ID_TESTNET,
  USDC_ASSET_ID_MAINNET,
}