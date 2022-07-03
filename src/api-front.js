const algosdk = require('algosdk');
const { Base64 } = require('js-base64');

export const USDC_ASSET_ID_TESTNET = 10458941;
export const USDC_ASSET_ID_MAINNET = 31566704;
export const AlgoSigner = window.AlgoSigner;

const ESCROW_ADDRESS="RMEXYVMWMOFWRNHETIV7HHKEWFPTYOOSCZKNWUWJCQF2PCI34ZFSW6ZBAA"
const ESCROW_MNEMONIC="castle maximum drastic skill purity grace hunt enlist toe quarter cloud cycle army mass secret struggle oxygen tattoo click typical coyote maid tumble absorb under"

/**
  --------------------------------------------------
        limitDate                | before |  after
  -------------------------------+--------+---------
   user bets                     |    O   |   X
  -------------------------------+------------------
   admin sets winner             |    X   |   O
  -------------------------------+--------+---------
   user claims(before set winner)|    X   |   X
  -------------------------------+------------------
   user claims(after set winner) |    X   |   O
  -------------------------------+------------------
*/

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
    if (typeof AlgoSigner !== 'undefined') {
      AlgoSigner.connect();
      this.ledgerName = ledgerName;
      this.usdcAssetId = usdcAssetId;
      this.fixedFee = fixedFee;
      this.xApiKey = 'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc';
      this.clientBaseServer = 'https://testnet-algorand.api.purestake.io/ps2';
      this.indexerBaseServer = 'https://testnet-algorand.api.purestake.io/idx2';
      this.client = new algosdk.Algodv2( { 'X-API-Key': this.xApiKey }, this.clientBaseServer, '');
      this.indexer = new algosdk.Indexer( { 'X-API-Key': this.xApiKey }, this.indexerBaseServer, '');
    } else {
      console.log('AlgoSigner is NOT installed.');
    };
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
    await this.#sendDoubleTxnsWallet(txn0, txn1);
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
    await this.#sendDoubleTxns(escrowAccount.sk, txn0, undefined, txn1);
    await this.getAccountAssetInfo(ESCROW_ADDRESS, this.usdcAssetId);
    await this.getAccountAssetInfo(address, this.usdcAssetId);
    console.log("Claim complete!");
  }

  /**
   * Get all accounts registered in this AlgoSigner wallet
   * @returns 
   */
  async getAccounts() {
    const accounts = await AlgoSigner.accounts({ ledger: 'TestNet' });
    console.log(JSON.stringify(accounts, undefined, 2));
    return accounts;
  }

  /**
   * @param {number} appId
   */
  async getAppInfoGlobal(appId)  {
    const rawInfo = await this.indexer.lookupApplications(appId).do();
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
            case "Team1":
              info.globalState.Team1 = val_str;
              break;
            case "Team2":
              info.globalState.Team2 = val_str;
              break;
            case "Winner":
              info.globalState.Winner = val_str;
              break;
            case "LimitDate":
            case "EndDate":
            case "FixedFee":
            case "Total1":
            case "Total2":
              info.globalState[key] = val_uint;
              break;
            case "Escrow": {
              const bytes = Base64.toUint8Array(item['value']['bytes']);
              const addr = algosdk.encodeAddress(bytes);
              info.globalState.Escrow = addr
              break;
            }

            default:
              console.warn(`Unexpected global variable "${key}" from app with id ${appId}`)
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
          case "MyTeam0":
            info.localState.MyTeam0 = val_str;
            break;
          case "MyTeam1":
            info.localState.MyTeam1 = val_str;
            break;
          case "MyTeam2":
            info.localState.MyTeam2 = val_str;
            break;
          case "MyTeam3":
            info.localState.MyTeam3 = val_str;
            break;
          case "MyTeam4":
            info.localState.MyTeam4 = val_str;
            break;
          case "MyTeam5":
            info.localState.MyTeam5 = val_str;
            break;
         case "MyBettingCount":
          case "MyBet0":
          case "MyBet1":
          case "MyBet2":
          case "MyBet3":
          case "MyBet4":
          case "MyBet5":
          case "MyTotal1":
          case "MyTotal2":
            info.localState[key] = val_uint;
            break;

          default:
            console.warn(`Unexpected local variable "${key}" from app with address ${address}, id ${appId}`)
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
  async #sendDoubleTxnsWallet(txn0, txn1) {
    console.log("#sendDoubleTxnsSame - ");
    algosdk.assignGroupID([txn0, txn1]);

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
   * @param {Uint8Array} sk0
   * @param {algosdk.Transaction} txn0
   * @param {Uint8Array} sk1
   * @param {algosdk.Transaction} txn1
   */
   async #sendDoubleTxns(sk0, txn0, sk1, txn1) {
    console.log("#sendDoubleTxns - ");
    algosdk.assignGroupID([txn0, txn1]);
    let binaryTxs = [txn0.toByte(), txn1.toByte()];
    let base64Txs = binaryTxs.map((binary) => AlgoSigner.encoding.msgpackToBase64(binary));

    let signedTxs = await AlgoSigner.signTxn([
      {
        txn: base64Txs[0],
        signers: sk0 ? [] : undefined,
      },
      {
        txn: base64Txs[1],
        signers: sk1 ? [] : undefined,
      },
    ]);

    // The AlgoSigner.signTxn() response would look like '[{ txID, blob }, null]'
    let signedTxn0Binary = sk0 ? txn0.signTxn(sk0) : AlgoSigner.encoding.base64ToMsgpack(signedTxs[0].blob);
    let signedTxn1Binary = sk1 ? txn1.signTxn(sk1) : AlgoSigner.encoding.base64ToMsgpack(signedTxs[1].blob);

    await this.client.sendRawTransaction([signedTxn0Binary, signedTxn1Binary]).do();
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
