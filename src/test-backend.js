const api = require('./api-backend');
const util = require('./util');

/**
 * simulate all workflow
 */
  async function test() {
  const ALGOD_TOKEN="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  const ALGOD_ADDRESS="http://localhost"
  const ALGOD_PORT=4001

  const INDEXER_ADDRESS="http://localhost"
  const INDEXER_PORT=8980
  const API_KEY=""

  const ADMIN_ADDRESS="FVNSMRZY3Z6CGATILBNY3DAZ652DGBHBB77SVM2BV3LEBOTZNOCUY6IIPE"
  const ADMIN_MNEMONIC="wolf exhibit rifle caution cube point tornado cake hybrid harvest weasel laptop lazy sentence february steel float hard this detail theory make tonight about this"

  const ESCROW_ADDRESS="RMEXYVMWMOFWRNHETIV7HHKEWFPTYOOSCZKNWUWJCQF2PCI34ZFSW6ZBAA"
  const ESCROW_MNEMONIC="castle maximum drastic skill purity grace hunt enlist toe quarter cloud cycle army mass secret struggle oxygen tattoo click typical coyote maid tumble absorb under"

  const USER1_ADDRESS="NGP2FQQ7UNLSVX2JX3ABM62AP6HDWY6NCGTCHVQRG2ZSXPK2A72KFNZA4Q"
  const USER1_MNEMONIC="gossip rice gun whisper inject foster shove unfold renew inner settle chimney guess absorb huge coffee fatigue future member ticket rain tissue runway absorb cheap"

  const USER2_ADDRESS="WYEGVAN3QSZLGXMOMKEEVNXIJFVAQTTEBEQ2NRFDPCZ3HHJZKBHGOU7UPU"
  const USER2_MNEMONIC="piece another expect relax practice april thunder sail danger limb magnet rare island walk project claw cook soda life lend come feature grab able absurd"

  // 1. Initialize the Core
  let core = new api.AutobookieCore(ALGOD_TOKEN, ALGOD_ADDRESS, ALGOD_PORT, api.USDC_ASSET_ID_TESTNET, 100*1000);

  // print assets info of admin and escrow
  await core.getAccountAssetInfo(ADMIN_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  await core.getAccountAssetInfo(ESCROW_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  
  // 2. admin creates dapp
  const limitDate = Math.round(Date.now()/1000) + 5*60;
  const endDate = Math.round(Date.now()/1000) + 10*60;
  let dapp = await core.createDapp(ADMIN_MNEMONIC, ESCROW_MNEMONIC, "team1", "team2", limitDate, endDate);

  // 3. users optin dapp
  await core.fakeUserOptinApp(USER1_MNEMONIC, dapp.appId);
  // await core.fakeUserOptinApp(USER2_MNEMONIC, dapp.appId);

  util.inputString("wait for user2 optin app");

  // print assets info of users after betting
  await core.getAccountAssetInfo(USER1_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  await core.getAccountAssetInfo(USER2_ADDRESS, api.USDC_ASSET_ID_TESTNET);

  // 4. users bet
  await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
  await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
  await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
  await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
  // await core.fakeUserBet(USER2_MNEMONIC, dapp.appId, 200*1000, 'team2', dapp.escrow.addr);

  // print assets info of users after betting
  await core.getAccountAssetInfo(USER1_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  await core.getAccountAssetInfo(USER2_ADDRESS, api.USDC_ASSET_ID_TESTNET);

  util.inputString("wait for user2 bet");

  // 5. admin sets winner to team2
  await core.setWinner(ADMIN_MNEMONIC, dapp.appId, 'team2', dapp.limitDate);

  // 6. user3 claim his winnings
  // await core.fakeUserClaim(USER2_MNEMONIC, dapp, 200*1000, 200*1000, 800*1000);

  util.inputString("wait for user2 claim");

  // print assets info of users after betting
  await core.getAccountAssetInfo(USER1_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  await core.getAccountAssetInfo(USER2_ADDRESS, api.USDC_ASSET_ID_TESTNET);

  // 7. admin deletes dapp
  await core.deleteDappById(ADMIN_MNEMONIC, dapp.appId);
}

test();
