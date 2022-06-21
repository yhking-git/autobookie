const api = require('./api.js');
const util = require('./util.js');

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
  let core = new api.AutobookieCore(ALGOD_TOKEN, ALGOD_ADDRESS, ALGOD_PORT, api.USDC_ASSET_ID_TESTNET, 2*1000*1000);

  // print assets info
  await core.getAccountAssetInfo(ADMIN_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  await core.getAccountAssetInfo(ESCROW_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  
  // 2. admin creates dapp
  const limitDate = Math.round(Date.now()/1000) + 60; // 1 minute from now
  const endDate = Math.round(Date.now()/1000) + 60*60*24*14; // 2 weeks from now
  let dapp = await core.createDapp(ADMIN_MNEMONIC, ESCROW_MNEMONIC, "team1", "team2", limitDate, endDate);

  // 3. users bet
  await core.bet(USER1_MNEMONIC, dapp, 4*1000*1000, 'team1');
  await core.bet(USER2_MNEMONIC, dapp, 3*1000*1000, 'team2');

  // 4. admin sets winner to team2
  await core.setWinner(ADMIN_MNEMONIC, dapp, 'team2');

  // 5. user3 claim his winnings
  await core.claim(USER2_MNEMONIC, dapp, 3*1000*1000, 3*1000*1000, 4*1000*1000);

  // 6. admin deletes dapp
  await core.deleteDappById(ADMIN_MNEMONIC, dapp.appId);
}

test();
