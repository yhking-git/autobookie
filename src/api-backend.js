const algosdk = require('algosdk');
const fs = require('fs');
const { Base64 } = require('js-base64');
const prompt = require("prompt-sync")({ sigint: true });

const USDC_ASSET_ID_TESTNET = 10458941;
const USDC_ASSET_ID_MAINNET = 31566704;

/**
 * @param {string} ask 
 */
function inputString(ask=undefined) {
  let s;
  if (process.stdin.isTTY) {
    ask ||= 'Input string';
    s = prompt(ask + ', press [ENTER] to continue ...');
  }

  return s;
}

/**
 * @param {string} s 
 */
function stringToByteArray(s) {
  return new TextEncoder().encode(s)
}

/**
 * @param {number} n 
 */
function numberToByteArray(n) {
  const bytes = new Uint8Array(4);
  bytes[0] = (n >> 24) & 0xff;
  bytes[1] = (n >> 16) & 0xff;
  bytes[2] = (n >> 8) & 0xff;
  bytes[3] = n & 0xff;
  return bytes;
}

/**
 * @param {string} date 
 * @returns 
 */
function stringToTimestamp(date) {
  return Math.round(new Date(date).getTime()/1000);
}

/**
 * @param {number} seconds in second
 * @returns 
 */
function sleep(seconds) {
  console.log('wait while sleep for ' + seconds + ' seconds');
  return new Promise(resolve => setTimeout(resolve, seconds*1000));
}

class AutobookieDapp {
  /**
   * @param {number} appId 
   * @param {string} creator 
   * @param {{addr: string, sk: Uint8Array, mnemonic: string}} escrow 
   * @param {string} team1 
   * @param {string} team2 
   * @param {number} limitDate 
   * @param {number} endDate 
   * @param {number} fixedFee 
   */
  constructor(appId, creator, escrow, team1, team2, limitDate, endDate, fixedFee) {
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
    /** @type {number} */
    this.fixedFee = fixedFee;
  }
}

/**
 * Interface of Algorand
 */
class AutobookieCore {
  /**
   * @param {string} ledgerName 'Sandbox'|'TestNet'|'MainNet'
   * @param {string} xApiKey 
   * @param {string} clientBaseServer 
   * @param {string} indexerBaseServer 
   * @param {string|number} port 
   */
  constructor(ledgerName,
              xApiKey,
              clientBaseServer,
              indexerBaseServer,
              port='') {
    /** @type {string} */
    this.ledgerName = ledgerName;
    /** @type {algosdk.Algodv2} */
    this.client = undefined;
    /** @type {algosdk.Indexer} */
    this.indexer = undefined;
    /** @type {number} */
    this.usdcAssetId = undefined;

    if (ledgerName === 'Sandbox') {
      this.ledgerName = 'TestNet';
      this.client = new algosdk.Algodv2('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'http://localhost', 4001);
      this.usdcAssetId = USDC_ASSET_ID_TESTNET;
    } else if (ledgerName === 'TestNet') {
      this.client = new algosdk.Algodv2({ 'X-API-Key': xApiKey }, clientBaseServer, port);
      this.indexer = new algosdk.Indexer( { 'X-API-Key': xApiKey }, indexerBaseServer, port);
      this.usdcAssetId = USDC_ASSET_ID_TESTNET;
    } else if (ledgerName  === 'MainNet') {
      this.client = new algosdk.Algodv2({ 'X-API-Key': xApiKey }, clientBaseServer, port);
      this.indexer = new algosdk.Indexer( { 'X-API-Key': xApiKey }, indexerBaseServer, port);
      this.usdcAssetId = USDC_ASSET_ID_TESTNET;
    }
  }

  /**
   * @param {number} appId
   */
  async getAppInfoGlobal(appId)  {
    const rawInfo = await this.indexer?.lookupApplications(appId).do();
    // console.log(JSON.stringify(rawInfo, undefined, 2));

    let info =  {};

    if (rawInfo && rawInfo['application'] && rawInfo['application']['params']) {
      const rawParams = rawInfo['application']['params'];
      info.creator = rawParams.creator;
      info.deleted = rawInfo.application.deleted;

      if (rawParams['global-state']) {
        info.globalState = {};

        const rawGlobalState = rawParams['global-state'];
        rawGlobalState.forEach(item => {
          const key = Buffer.from(item['key'], 'base64').toString('ascii');
          const val_str = Buffer.from(item['value']['bytes'], 'base64').toString('ascii');
          const val_uint = item['value']['uint'];
          switch (key) {
            case 'Team1':
              info.globalState.Team1 = val_str;
              break;
            case 'Team2':
              info.globalState.Team2 = val_str;
              break;
            case 'Winner':
              info.globalState.Winner = val_str;
              break;
            case 'LimitDate':
            case 'EndDate':
            case 'FixedFee':
            case 'Total1':
            case 'Total2':
              info.globalState[key] = val_uint;
              break;
            case 'Escrow': {
              const bytes = Base64.toUint8Array(item['value']['bytes']);
              const addr = algosdk.encodeAddress(bytes);
              info.globalState.Escrow = addr
              break;
            }

            default:
              console.warn(`Unexpected global variable '${key}' from app with id ${appId}`)
              break;
          }
        });
      }
    }
    // console.log(JSON.stringify(info, undefined, 2));

    return info;
  }

  /**
   * @param {string} address
   * @param {number} appId
   * @return empty object {} if address does not optin app
   */
   async getAppInfoLocal(address, appId) {
    console.log(``)
    const rawInfo = await this.client.accountApplicationInformation(address, appId).do();
    // console.log(JSON.stringify(rawInfo, undefined, 2));
    
    let info =  {};

    if (rawInfo && rawInfo['app-local-state'] && rawInfo['app-local-state']['key-value']) {
      info.localState = {};

      const rawLocalState = rawInfo['app-local-state']['key-value'];
      rawLocalState.forEach(item => {
        const key = Buffer.from(item['key'], 'base64').toString('ascii');
        const val_str = Buffer.from(item['value']['bytes'], 'base64').toString('ascii');
        const val_uint = item['value']['uint'];
        switch (key) {
          case 'MyTeam0':
            info.localState.MyTeam0 = val_str;
            break;
          case 'MyTeam1':
            info.localState.MyTeam1 = val_str;
            break;
          case 'MyTeam2':
            info.localState.MyTeam2 = val_str;
            break;
          case 'MyTeam3':
            info.localState.MyTeam3 = val_str;
            break;
          case 'MyTeam4':
            info.localState.MyTeam4 = val_str;
            break;
          case 'MyTeam5':
            info.localState.MyTeam5 = val_str;
            break;
         case 'MyBettingCount':
          case 'MyBet0':
          case 'MyBet1':
          case 'MyBet2':
          case 'MyBet3':
          case 'MyBet4':
          case 'MyBet5':
          case 'MyTotal1':
          case 'MyTotal2':
            info.localState[key] = val_uint;
            break;

          default:
            console.warn(`Unexpected local variable '${key}' from app with address ${address}, id ${appId}`)
            break;
        }
      });
    }
    // console.log(JSON.stringify(info, undefined, 2));

    return info;
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
        if (scrutinizedAsset['asset-id'] == assetId) {
            // let myassetinfo = JSON.stringify(scrutinizedAsset, undefined, 2);
            assetInfo.asset = scrutinizedAsset;
            break;
        }
    }

    console.log('info = ' + JSON.stringify(assetInfo, undefined, 2));
    return assetInfo
  }

  /**
   * @param {string} mnemonic 
   */
  async makeAccoutCanUseUsdc(mnemonic) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const txn = await this.#makeUsdcTransferTxn(account.addr, account.addr, 0);
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
   * @param {number} fixedFee 
   * @return {AutobookieDapp} 
   */
  async createDapp(creatorMnemonic, escrowMnemonic, team1, team2, limitDate, endDate, fixedFee) {
    console.log(`Creating DApp... ${limitDate} ~ ${endDate}`);
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    // create dapp
    const args = [stringToByteArray(team1),
                  stringToByteArray(team2),
                  numberToByteArray(limitDate),
                  numberToByteArray(endDate),
                  numberToByteArray(fixedFee)
    ];
    const response = await this.#createApp(5, 4, 9, 6, './teal/approval.teal', './teal/clear.teal', creatorAccount, args);
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
    // const txn = algosdk.makePaymentTxnWithSuggestedParams(creatorAccount.addr, escrowAccount.addr, 1000000, undefined, undefined, await this.#getMinParams());
    // await this.#sendSingleTxn(creatorAccount.sk, txn);
    // await this.getAccountAssetInfo(escrowAccount.addr, 0);
    // console.log('Funding escrow account done');

    await this.makeAccoutCanUseUsdc(escrow.mnemonic);
    const dapp = new AutobookieDapp(appId, creatorAccount.addr, escrow, team1, team2, limitDate, endDate, fixedFee);
    await this.setEscrow(creatorMnemonic, dapp);
    console.log('DApp created: ', dapp);
    return dapp;
  }

  /**
   * @param {string} mnemonic
   * @param {AutobookieDapp} dapp 
   * @returns {string}
   */
  async setEscrow(mnemonic, dapp) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(`Updating application ${dapp.appId} with escrow address`);
    await this.#callAppNoOp(account, dapp.appId, [stringToByteArray('escrow'), algosdk.decodeAddress(dapp.escrow.addr).publicKey]);
    console.log('Successfully updated escrow address:');
  }

  /**
   * @param {string} mnemonic 
   * @param {number} appId 
   * @param {string} winner 
   * @param {number} limitDate 
   */
  async setWinner(mnemonic, appId, winner, limitDate=undefined) {
    console.log(`Updating application ${appId} with winner ${winner}`);
    const now =  Math.round(Date.now()/1000);

    if (limitDate) {
      const seconds = limitDate - now;
      if (seconds > 0) {
        await sleep(seconds + 10);
      }
    }
  
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const response = await this.#callAppNoOp(account, appId, [stringToByteArray('winner'), stringToByteArray(winner)]);
    console.log('Successfully update application:');
    console.log(response, '\n\n');
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
      const usdcTxn = await this.#makeUsdcTransferTxn(dapp.escrow.addr, account.addr, info.asset.amount);
      await this.#sendSingleTxn(dapp.escrow.sk, usdcTxn);
      info = await this.getAccountAssetInfo(dapp.escrow.addr, this.usdcAssetId);
    }
    // algo
    const params = await this.#getMinParams();
    const txn0 = algosdk.makePaymentTxnWithSuggestedParams(dapp.escrow.addr, account.addr, 0, undefined, undefined, params);
    const txn1 = algosdk.makeApplicationDeleteTxn(account.addr, params, dapp.appId);
    await this.#sendDoubleTxns(dapp.escrow.sk, txn0, account.sk, txn1);
    console.log('Deleted appId: ', dapp.appId);
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
    const txn = algosdk.makeApplicationDeleteTxn(account.addr, params, appId);
    const signedTxn = txn.signTxn(account.sk);
    const {txId} = await this.client.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(this.client, txId, 20);
    console.log('Deleted appId: ', appId);
    console.log('All done!');
  }

  /**
   * @param {string} mnemonic 
   * @param {number} appId 
   */
  async fakeUserOptinApp(mnemonic, appId) {
    console.log('Prepare Betting starting...');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const params = await this.#getMinParams();
    const txn = algosdk.makeApplicationOptInTxn(account.addr, params, appId);
    console.log('Prepare Betting complete!');
    return this.#sendSingleTxn(account.sk, txn);
  }

  /**
   * @param {string} mnemonic
   * @param {number} appId
   * @param {number} amount
   * @param {string} myTeam
   * @param {string} escrowAddr
   */
  async fakeUserBet(mnemonic, appId, amount, myTeam, escrowAddr) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(`${account.addr} is betting on ${myTeam} ${amount} USDC`);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(account.addr, escrowAddr, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(account.addr, params, appId, [stringToByteArray('bet'), stringToByteArray(myTeam)]);
    await this.#sendDoubleTxns(account.sk, txn0, account.sk, txn1);
    console.log('Betting complete!');
  }

  /**
   * Claim winnings for a given user.
   * @param {string} mnemonic
   * @param {AutobookieDapp} dapp
   * @param {number} myBet
   * @param {number} myTeamTotal
   * @param {number} otherTeamTotal
   */
  async fakeUserClaim(mnemonic, dapp, myBet, myTeamTotal, otherTeamTotal) {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const amount = this.#calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal, dapp.fixedFee);
    console.log('Claiming ' + amount + ' with account ' + account.addr);
    await this.getAccountAssetInfo(dapp.escrow.addr, this.usdcAssetId);
    await this.getAccountAssetInfo(account.addr, this.usdcAssetId);
    const params = await this.#getMinParams();
    const txn0 = await this.#makeUsdcTransferTxn(dapp.escrow.addr, account.addr, amount);
    const txn1 = algosdk.makeApplicationNoOpTxn(account.addr, params, dapp.appId, [stringToByteArray('claim')]);
    await this.#sendDoubleTxns(dapp.escrow.sk, txn0, account.sk, txn1);
    await this.getAccountAssetInfo(dapp.escrow.addr, this.usdcAssetId);
    await this.getAccountAssetInfo(account.addr, this.usdcAssetId);
    console.log('Claim complete!');
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
  async #callAppNoOp(account, appId, args=null) {
    const params = await this.#getMinParams();
    const txn = algosdk.makeApplicationNoOpTxn(account.addr, params, appId, args);
    const signedTxn = txn.signTxn(account.sk);
    const txId = txn.txID();
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
    const appId = transactionResponse['application-index'];
    console.log('Created new app-id: ', appId);

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
  #calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal, fee) {
    return Math.floor(myBet / myTeamTotal * (myTeamTotal + otherTeamTotal) - fee)
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
  inputString,
  stringToTimestamp,
  USDC_ASSET_ID_TESTNET,
  USDC_ASSET_ID_MAINNET,
}
