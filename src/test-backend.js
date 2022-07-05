const api = require('./api-backend');

/**
 * simulate all workflow
 */
async function test() {
  // test group 1 : you can use this
  const ADMIN_ADDRESS='FVNSMRZY3Z6CGATILBNY3DAZ652DGBHBB77SVM2BV3LEBOTZNOCUY6IIPE'
  const ADMIN_MNEMONIC='wolf exhibit rifle caution cube point tornado cake hybrid harvest weasel laptop lazy sentence february steel float hard this detail theory make tonight about this'

  const ESCROW_ADDRESS='RMEXYVMWMOFWRNHETIV7HHKEWFPTYOOSCZKNWUWJCQF2PCI34ZFSW6ZBAA'
  const ESCROW_MNEMONIC='castle maximum drastic skill purity grace hunt enlist toe quarter cloud cycle army mass secret struggle oxygen tattoo click typical coyote maid tumble absorb under'

  const USER1_ADDRESS='NGP2FQQ7UNLSVX2JX3ABM62AP6HDWY6NCGTCHVQRG2ZSXPK2A72KFNZA4Q'
  const USER1_MNEMONIC='gossip rice gun whisper inject foster shove unfold renew inner settle chimney guess absorb huge coffee fatigue future member ticket rain tissue runway absorb cheap'

  const USER2_ADDRESS='WYEGVAN3QSZLGXMOMKEEVNXIJFVAQTTEBEQ2NRFDPCZ3HHJZKBHGOU7UPU'
  const USER2_MNEMONIC='piece another expect relax practice april thunder sail danger limb magnet rare island walk project claw cook soda life lend come feature grab able absurd'

  // test group 2 : only for me
  // const ADMIN_ADDRESS='GLPP7T2HNOCA4VWEFBISFNBZOJV74XODXO5TP3YNNIBIZDEEWY4N2WZSUI'
  // const ADMIN_MNEMONIC='flat arctic post stamp toss crucial vanish air mobile street unable error clerk alcohol year tattoo traffic goddess wealth rubber scatter scene potato absent silent'

  // const ESCROW_ADDRESS='2I4RYUH6SPUXKCLT7GGYQZKCT2QE3ODIA25YVUIF4AY7WKX2U6ZY2LIF5Y'
  // const ESCROW_MNEMONIC='duty around popular spatial curve blue lawsuit mail one harsh culture absorb surge hybrid romance online better enjoy quantum lamp paper over farm abandon rebuild'

  // const USER1_ADDRESS='TWZIELUOPO2ALKD5QGWB4JWBBM4T5UEYXVERO4IJWAESPW2FSVOA76JMJE'
  // const USER1_MNEMONIC='never hint undo valve sunset brief sample town minor clerk still hurt assault leaf place scale price regular panel audit gas machine dice absent seminar'

  // const USER2_ADDRESS='EFKFA6BFYHPAWJRALYJKX2O4RDKZFD6HTSN73EQ4N3T2J4M6RJIKTKOYGQ'
  // const USER2_MNEMONIC='must tunnel action frost moment cloth deny note vague area acid crack sell jealous aerobic because network veteran blouse celery observe swallow neck about mother'


  // 1. Initialize the Core

  // let core = new api.AutobookieCore('Sandbox', undefined, undefined, undefined);

  let core = new api.AutobookieCore('TestNet',
                                    'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
                                    'https://testnet-algorand.api.purestake.io/ps2',
                                    'https://testnet-algorand.api.purestake.io/idx2');

  // let core = new api.AutobookieCore('MainNet',
  //                                   'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
  //                                   'https://mainnet-algorand.api.purestake.io/ps2',
  //                                   'https:/mainnet-algorand.api.purestake.io/idx2');


  // await core.makeAccoutCanUseUsdc(ADMIN_MNEMONIC);
  // await core.makeAccoutCanUseUsdc(ESCROW_MNEMONIC);
  // await core.makeAccoutCanUseUsdc(USER1_MNEMONIC);
  // await core.makeAccoutCanUseUsdc(USER2_MNEMONIC);

  // print assets info of admin and escrow
  await core.getAccountAssetInfo(ADMIN_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  await core.getAccountAssetInfo(ESCROW_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  
  // 2. admin creates dapp
  const limitDate = Math.round(Date.now()/1000) + 5*60;
  const endDate = Math.round(Date.now()/1000) + 10*60;
  let dapp = await core.createDapp(ADMIN_MNEMONIC, ESCROW_MNEMONIC, 'team1', 'team2', limitDate, endDate, 100*1000);

  // 3. users optin dapp
  await core.fakeUserOptinApp(USER1_MNEMONIC, dapp.appId);
  // await core.fakeUserOptinApp(USER2_MNEMONIC, dapp.appId);

  api.inputString('wait for user2 optin app');

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

  api.inputString('wait for user2 bet');

  // 5. admin sets winner to team2
  await core.setWinner(ADMIN_MNEMONIC, dapp.appId, 'team2', dapp.limitDate);

  // 6. user3 claim his winnings
  // await core.fakeUserClaim(USER2_MNEMONIC, dapp, 200*1000, 200*1000, 800*1000);

  api.inputString('wait for user2 claim');

  // print assets info of users after betting
  await core.getAccountAssetInfo(USER1_ADDRESS, api.USDC_ASSET_ID_TESTNET);
  await core.getAccountAssetInfo(USER2_ADDRESS, api.USDC_ASSET_ID_TESTNET);

  // 7. admin deletes dapp
  await core.deleteDappById(ADMIN_MNEMONIC, dapp.appId);
}

test();
