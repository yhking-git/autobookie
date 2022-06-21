const algosdk = require('algosdk');
const prompt = require("prompt-sync")({ sigint: true });
const fs = require('fs');
const dotenv = require('dotenv');
const { LogicSigAccount } = require('algosdk');


dotenv.config({path: 'env.testnet'});
const client = new algosdk.Algodv2(process.env.ALGOD_TOKEN, process.env.ALGOD_ADDRESS, parseInt(process.env.ALGOD_PORT));
const indexer = new algosdk.Indexer(process.env.ALGOD_TOKEN, process.env.INDEXER_ADDRESS, parseInt(process.env.INDEXER_PORT));


/**
 * 
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
async function txnCreateApplication(numGlobalInts, numGlobalByteSlices, numLocalInts, numLocalByteSlices, approvalProgram, clearProgram, account, appArgs=null) {
  const params = await getMinParams();
  const txn = algosdk.makeApplicationCreateTxn(
    account.addr,
    params,
    algosdk.OnApplicationComplete.NoOpOC,
    await compileTealFile(approvalProgram),
    await compileTealFile(clearProgram),
    numLocalInts,
    numLocalByteSlices,
    numGlobalInts,
    numGlobalByteSlices,
    appArgs
  );
  const signedTxn = txn.signTxn(account.sk);
  const txId = txn.txID();
  await client.sendRawTransaction(signedTxn).do();
  const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 20);
  const transactionResponse = await client.pendingTransactionInformation(txId).do();
  let appId = transactionResponse['application-index'];
  console.log("Created new app-id: ",appId);

  return transactionResponse;
}


/**
 * 
 * @param {number} appId 
 * @param {algosdk.Account} account
 * @param {Uint8Array[]} args
 */
async function txnCallApplication(appId, account, args=null) {
  const params = await getMinParams();
  const txn = algosdk.makeApplicationNoOpTxn(account.addr, params, appId, args);
  const signedTxn = txn.signTxn(account.sk);
  let txId = txn.txID();
  await client.sendRawTransaction(signedTxn).do();
  await algosdk.waitForConfirmation(client, txId, 20)
  const response = await client.pendingTransactionInformation(txId).do();
  console.log("Called app-id: ",response['txn']['txn']['apid'])
  return response
}


/**
 * 
 * @param {alogsdk.Account} account 
 * @param {number} appId 
 */
async function txnDeleteApplication(account, appId) {
  const params = await getMinParams();
  const txn = algosdk.makeApplicationDeleteTxn(account.addr, params, appId);
  const signedTxn = txn.signTxn(account.sk);
  const txId = txn.txID();
  await client.sendRawTransaction(signedTxn).do();
  await algosdk.waitForConfirmation(client, txId, 20);
  const transactionResponse = await client.pendingTransactionInformation(txId).do();
  const deletedAppId = transactionResponse['txn']['txn'].apid;
  console.log("Deleted appId: ", deletedAppId);
  return txn;
}


/**
 * 
 * @param {algosdk.Account} account 
 * @param {string} receiver 
 * @param {number} amount 
 * @returns 
 */
async function txnPayment(account, receiver, amount) {
  const params = await getMinParams();
  let txn = algosdk.makePaymentTxnWithSuggestedParams(account.addr, receiver, amount, undefined, new Uint8Array(0), params);
  const signedTxn = txn.signTxn(account.sk);
  let txId = txn.txID();
  await client.sendRawTransaction(signedTxn).do();
  await algosdk.waitForConfirmation(client, txId, 20);
  return txId;
}


/**
 * 
 * @param {algosdk.Account} account 
 * @param {string} team1 
 * @param {string} team2 
 * @param {number} limitDate 
 * @param {number} endDate 
 */
async function dappCreateByAccount(account, team1, team2, limitDate, endDate){
  console.log(`Creating DApp... ${limitDate} ~ ${endDate}`);
  const appId = await dappDeploy(account, team1, team2, limitDate, endDate);
  // const appId = 89424287;
  const escrow = await setEscrow(account, appId);
  console.log('Funding escrow account')

  const txId = await txnPayment(account, escrow, 100000);
  console.log('All done!');

  return {appId, escrow, txId};
}


/**
 * 
 * @param {string} mnemonic 
 * @param {string} team1 
 * @param {string} team2 
 * @param {number} limitDate 
 * @param {number} endDate 
 */
function dappCreate(mnemonic, team1, team2, limitDate, endDate){
  return dappCreateByAccount(createOrGetAccount(mnemonic), team1, team2, limitDate, endDate);
}


/**
 * 
 * @param {string} mnemoic 
 * @returns 
 */
function createOrGetAccount(mnemoic=null) {
  try {
    let account_mnemoic;
    let account

    if (mnemoic === null || mnemoic === undefined) {
      account = algosdk.generateAccount();
      account_mnemoic = algosdk.secretKeyToMnemonic(account.sk);
      // let temp_accouont = algosdk.mnemonicToSecretKey(account_mnemoic);
      // console.log("        Address = " + temp_accouont.addr);
      // console.log("        sk = " + temp_accouont.sk);
    } else {
      account = algosdk.mnemonicToSecretKey(mnemoic);
      account_mnemoic = mnemoic;
    }

    console.log("Account Address = " + account.addr);
    console.log("Account sk = " + account.sk);
    console.log("Account Mnemonic = " + account_mnemoic);
    console.log("Account create. Save off Mnemonic and address");
    console.log("Add funds to account using the TestNet dispenser: ");
    console.log("https://dispenser.testnet.aws.algodev.network/ ");
    return account;
  }
  catch (err) {
    console.log("err", err);
  }
}


/**
 * 
 * @param {string} mnemonic 
 * @param {number} appId 
 * @param {boolean} closeOut
 */
async function dappDelete(mnemonic, appId, closeOut=true) {
  console.log('WARNING! This will permenantly delete the application, and any assets left in the escrow address will be unrecoverable!');

  if (process.stdin.isTTY) {
    const i = prompt('Are you sure you wish to continue? [y/N]');
    if (i.toLowerCase() != 'y') {
      console.log('Aborted');
      return;
    }
  }

  const account = createOrGetAccount(mnemonic);

  if (closeOut) {
    let lsig = await getLogicSigAccount(appId);
    const params = await getMinParams();
    let txn0 = algosdk.makePaymentTxnWithSuggestedParams(lsig.address(), account.addr, 0, account.addr, new Uint8Array(0), params);
    let txn1 = algosdk.makeApplicationDeleteTxn(account.addr, params, appId);
    const gid = algosdk.computeGroupID([txn0, txn1]);
    txn0.group = gid;
    txn1.group = gid;
    const signedTxn0 = algosdk.signLogicSigTransaction(txn0, lsig);
    const signedTxn1 = txn1.signTxn(account.sk);
    const {txId} = await client.sendRawTransaction([signedTxn0.blob, signedTxn1]).do();
    await algosdk.waitForConfirmation(client, txId, 20);
    console.log("Deleted appId: ", appId);
} else {
    await txnDeleteApplication(account, appId);
  }

  console.log('All done!');
}


/**
 * 
 * @param {string} tealString 
 */
async function compileTealString(tealString) {
  const src = tealString || '#pragma version 2\nint 1';
  const compiled = await client.compile(src).do();
  return new Uint8Array(Buffer.from(compiled.result, 'base64'));
}


/**
 * 
 * @param {string} fileName 
 */
async function compileTealFile(fileName) {
  const src = fs.readFileSync(fileName, 'utf8') || '#pragma version 2\nint 1';
  return compileTealString(src);
}


/**
 * 
 * @param {string} date 
 * @returns 
 */
function dateToTimestamp(date) {
  return Math.round(new Date(date).getTime()/1000);
}


/**
 * 
 * @param {number} n 
 */
function makeArgFromNumber(n) {
  const bytes = new Uint8Array(4);
  bytes[0] = (n >> 24) & 0xff;
  bytes[1] = (n >> 16) & 0xff;
  bytes[2] = (n >> 8) & 0xff;
  bytes[3] = n & 0xff;
  return bytes;
}


/**
 * 
 * @param {string} s 
 */
function makeArgFromString(s) {
  return new TextEncoder().encode(s)
}

/**
 * 
 * @param {algosdk.Account} account 
 * @param {string} team1 
 * @param {string} team2 
 * @param {string} limitDate 
 * @param {string} endDate 
 */
async function dappDeploy(account, team1, team2, limitDate, endDate) {
  const args = [makeArgFromString(team1), makeArgFromString(team2), makeArgFromNumber(limitDate), makeArgFromNumber(endDate)];
  console.log('Deploying application with args: ', args);

  const response = await txnCreateApplication(4, 4, 1, 1, './teal/approval.teal', './teal/clear.teal', account, args);
  console.log('Successfully deployed application: ');
  console.log(response, '\n\n');

  return response['application-index'];
}


/**
 * 
 * @param {number} appId 
 * @returns 
 */
function generateEscrow(appId) {
  let src = fs.readFileSync('./teal/escrow.teal', 'UTF-8');
  return src.replace('TMPL_APP_ID', appId.toString());
}


/**
 * Query the blockchain for suggested params, and set flat fee to True and the fee to the minimum.
 * @returns The paramaters.
 */
async function getMinParams() {
  let suggestedParams = await client.getTransactionParams().do();
  suggestedParams.flatFee  = true;
  suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE;

  return suggestedParams
}


/**
 * 
 * @param {algosdk.Account} account 
 * @param {number} appId 
 */
async function setEscrow(account, appId) {
  console.log(`Updating application ${appId} with escrow address`);

  const src = generateEscrow(appId);
  const compiled = await client.compile(src).do();
  const escrowHash = compiled['hash'];
  console.log(`Escrow address is ${escrowHash}`);

  const escrowAddress = algosdk.decodeAddress(escrowHash);
  const response = await txnCallApplication(appId, account, [makeArgFromString('escrow'), escrowAddress.publicKey]);

  console.log('Successfully updated application:');
  console.log(response, '\n\n');
  return escrowHash;
}


/**
 * 
 * @param {string} mnemonic 
 * @param {number} appId 
 * @param {string} team 
 */
async function setWinner(mnemonic, appId, team) {
  console.log(`Updating application ${appId} with winner ${team}`);

  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const response = await txnCallApplication(appId, account, [makeArgFromString('winner'), makeArgFromString(team)]);
  console.log("Successfully update application:");
  // console.log(response, '\n\n');
}


/**
 * 
 * @param {string} mnemonic 
 * @param {number} appId 
 * @param {string} approvalProgramFileName 
 * @param {string} clearProgramFileName 
 * @param {object} args 
 */
async function dappUpdate(mnemonic, appId, approvalProgramFileName, clearProgramFileName, args=null) {
  console.log(`Updating application ${appId} with approval and clear programs`);
  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const compiledApprovalProgram = await compileTealFile(approvalProgramFileName);
  const compiledClearProgram = await compileTealFile(clearProgramFileName);
  const params = await getMinParams();
  const txn = algosdk.makeApplicationUpdateTxn(account.addr, params, appId, compiledApprovalProgram, compiledClearProgram, args);
  const signedTxn = txn.signTxn(account.sk);
  let txId = txn.txID();

  await client.sendRawTransaction(signedTxn).do();
  console.log("Waiting for confirmation...");

  await algosdk.waitForConfirmation(client, txId, 20);

  const transactionResponse = await client.pendingTransactionInformation(txId).do();
  console.log("Successfully updated application:");

  return transactionResponse;
}


/**
 * 
 * @param {string} mnemonic
 * @param {number} appId
 * @param {string} escrow
 * @param {number} amount
 * @param {string} team
 */
async function bet(mnemonic, appId, escrow, amount, team) {
  console.log("Betting starting...");
  const account = algosdk.mnemonicToSecretKey(mnemonic);
  console.log(`    ${account.addr} is betting on ${team} ${amount} micro algos`);

  const params = await getMinParams();

  // Construct the transaction
  const txn0 = algosdk.makePaymentTxnWithSuggestedParams(account.addr, escrow, amount, undefined, new Uint8Array(0), params);
  const txn1 = algosdk.makeApplicationOptInTxn(account.addr, params, appId, [makeArgFromString(team)]);

  // Sign and send
  await combineAndSend(account, txn0, txn1);
  console.log("Betting complete!");
}


/**
 * Helper function to combine two transactions, sign them with AlgoSigner, and send them to the blockchain
 * @param {algosdk.Account} account The first transaction
 * @param {Transaction} txn0 The first transaction
 * @param {Transaction} txn1 The second transaction
 */
async function combineAndSend(account, txn0, txn1) {
  const gid = algosdk.computeGroupID([txn0, txn1]);
  txn0.group = gid;
  txn1.group = gid;
  const signedTxn0 = txn0.signTxn(account.sk);
  const signedTxn1 = txn1.signTxn(account.sk);
  const {txId} = await client.sendRawTransaction([signedTxn0, signedTxn1]).do();
  const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 20);
  console.log(`combineAndSend: done`);
}


/**
 * Helper function used to calculate how much a user is entitled to if they win for the given parameters.
 * @param {number} myBet 
 * @param {number} myTeamTotal 
 * @param {number} otherTeamTotal 
 * @param {number} fee 
 * @returns {number} The amount a user may claim.
 */
function calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal, fee = 1000) {
  return Math.floor(myBet / myTeamTotal * (myTeamTotal + otherTeamTotal) - fee)
}


/**
 * 
 * @param {number} myBet 
 * @param {number} fee 
 * @returns {number} The amount a user may reclaim.
 */
function calculateReclaimAmount(myBet, fee = 1000) {
  return myBet - fee
}


/**
 * 
 * @param {number} appId 
 */
async function getLogicSigAccount(appId) {
  const src = generateEscrow(appId);
  const program = await compileTealString(src);
  let lsig = new LogicSigAccount(program);

  return lsig;
}


/**
 * Claim winnings for a given user.
 * @param {string} mnemonic
 * @param {number} appId
 * @param {number} myBet
 * @param {number} myTeamTotal
 * @param {number} otherTeamTotal
 */
async function claim(mnemonic, appId, myBet, myTeamTotal, otherTeamTotal, fee = algosdk.ALGORAND_MIN_TX_FEE) {
  const amount = calculateClaimAmount(myBet, myTeamTotal, otherTeamTotal);
  const account = algosdk.mnemonicToSecretKey(mnemonic);
  console.log("Claiming " + amount + " with account " + account.addr);
  const i = prompt('Are you sure you wish to continue? [y/N]');
  if (i.toLowerCase() != 'y') {
    console.log('Aborted');
    return;
  }
  let lsig = await getLogicSigAccount(appId);
  const params = await getMinParams();
  let txn0 = algosdk.makePaymentTxnWithSuggestedParams(lsig.address(), account.addr, amount, undefined, new Uint8Array(0), params);
  let txn1 = algosdk.makeApplicationNoOpTxn(account.addr, params, appId, [makeArgFromString('claim')]);
  const gid = algosdk.computeGroupID([txn0, txn1]);
  txn0.group = gid;
  txn1.group = gid;
  const signedTxn0 = algosdk.signLogicSigTransaction(txn0, lsig);
  const signedTxn1 = txn1.signTxn(account.sk);
  const {txId} = await client.sendRawTransaction([signedTxn0.blob, signedTxn1]).do();
  console.log(`Waiting for confirmation... txId: ${txId}`);

  await algosdk.waitForConfirmation(client, txId, 20);
  console.log("Claim complete!");
}


module.exports = {
  // Dapp functions
  dappCreate,
  dappDelete,
  dappUpdate,
  dateToTimestamp,

  // Game functions
  bet,
  setWinner,
  claim,

  calculateClaimAmount,
  calculateReclaimAmount,

}
