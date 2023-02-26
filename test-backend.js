const api = require('./api-backend');

/**
 * simulate all workflow
 */
async function test([arg0, ]) {
  // test account group 1
  const ADMIN_ADDRESS='FVNSMRZY3Z6CGATILBNY3DAZ652DGBHBB77SVM2BV3LEBOTZNOCUY6IIPE'
  const ADMIN_MNEMONIC='wolf exhibit rifle caution cube point tornado cake hybrid harvest weasel laptop lazy sentence february steel float hard this detail theory make tonight about this'

  const ESCROW_ADDRESS='RMEXYVMWMOFWRNHETIV7HHKEWFPTYOOSCZKNWUWJCQF2PCI34ZFSW6ZBAA'
  const ESCROW_MNEMONIC='castle maximum drastic skill purity grace hunt enlist toe quarter cloud cycle army mass secret struggle oxygen tattoo click typical coyote maid tumble absorb under'

  const USER1_ADDRESS='NGP2FQQ7UNLSVX2JX3ABM62AP6HDWY6NCGTCHVQRG2ZSXPK2A72KFNZA4Q'
  const USER1_MNEMONIC='gossip rice gun whisper inject foster shove unfold renew inner settle chimney guess absorb huge coffee fatigue future member ticket rain tissue runway absorb cheap'

  const USER2_ADDRESS='WYEGVAN3QSZLGXMOMKEEVNXIJFVAQTTEBEQ2NRFDPCZ3HHJZKBHGOU7UPU'
  const USER2_MNEMONIC='piece another expect relax practice april thunder sail danger limb magnet rare island walk project claw cook soda life lend come feature grab able absurd'

  // test account group 2
  // const ADMIN_ADDRESS='GLPP7T2HNOCA4VWEFBISFNBZOJV74XODXO5TP3YNNIBIZDEEWY4N2WZSUI'
  // const ADMIN_MNEMONIC='flat arctic post stamp toss crucial vanish air mobile street unable error clerk alcohol year tattoo traffic goddess wealth rubber scatter scene potato absent silent'

  // const ESCROW_ADDRESS='2I4RYUH6SPUXKCLT7GGYQZKCT2QE3ODIA25YVUIF4AY7WKX2U6ZY2LIF5Y'
  // const ESCROW_MNEMONIC='duty around popular spatial curve blue lawsuit mail one harsh culture absorb surge hybrid romance online better enjoy quantum lamp paper over farm abandon rebuild'

  // const USER1_ADDRESS='TWZIELUOPO2ALKD5QGWB4JWBBM4T5UEYXVERO4IJWAESPW2FSVOA76JMJE'
  // const USER1_MNEMONIC='never hint undo valve sunset brief sample town minor clerk still hurt assault leaf place scale price regular panel audit gas machine dice absent seminar'

  // const USER2_ADDRESS='EFKFA6BFYHPAWJRALYJKX2O4RDKZFD6HTSN73EQ4N3T2J4M6RJIKTKOYGQ'
  // const USER2_MNEMONIC='must tunnel action frost moment cloth deny note vague area acid crack sell jealous aerobic because network veteran blouse celery observe swallow neck about mother'


  // 1. Initialize the Core
  // let core = new api.AutobookieCore('sandbox',
  //                                   undefined,
  //                                   undefined,
  //                                   undefined);
  let core = new api.AutobookieCore('testnet',
                                    'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
                                    'https://testnet-algorand.api.purestake.io/ps2',
                                    'https://testnet-algorand.api.purestake.io/idx2');
  // let core = new api.AutobookieCore('mainnet',
  //                                   'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
  //                                   'https://mainnet-algorand.api.purestake.io/ps2',
  //                                   'https:/mainnet-algorand.api.purestake.io/idx2');


  // 1.1 Optional: Make accounts can use USDC
  // await core.makeAccoutCanUseUsdc(ADMIN_MNEMONIC);
  // await core.makeAccoutCanUseUsdc(ESCROW_MNEMONIC);
  // await core.makeAccoutCanUseUsdc(USER1_MNEMONIC);
  // await core.makeAccoutCanUseUsdc(USER2_MNEMONIC);


  if (arg0 && arg0.toLowerCase() === 'ex') {
    const DEFLEX_MNEMONIC = 'bottom stone elegant just symbol bunker review curve laugh burden jewel pepper replace north tornado alert relief wrist better property spider picture insect abandon tuna';
    const DEFLEX_ADDRESS = 'DWQXOZMGDA6QZRSPER6O4AMTO3BQ6CEJMFO25EWRRBK72RJO54GLDCGK4E'

    // ALGO -> USDC
    await api.exchange('testnet', ESCROW_MNEMONIC, api.ALGO_ASSET_ID, api.USDC_ASSET_ID_TESTNET, 1000000, core.token, core.clientUri, core.port);
    // USDC -> ALGO
    await api.exchange('testnet', ESCROW_MNEMONIC, api.USDC_ASSET_ID_TESTNET, api.ALGO_ASSET_ID, 1000000, core.token, core.clientUri, core.port);
  } else {

    console.log('\nPrint assets info of admin and escrow\n');
    console.log('admin assets = ', await core.getAccountAssetInfo(ADMIN_ADDRESS, core.usdcAssetId));
    console.log('escrow assets = ', await core.getAccountAssetInfo(ESCROW_ADDRESS, core.usdcAssetId));


    // 2. admin creates dapp
    const limitDate = Math.round(Date.now()/1000) + 3*60;
    const endDate = Math.round(Date.now()/1000) + 5*60;
    const fixedFee = 100*1000;
    let dapp = await core.createDapp(ADMIN_MNEMONIC, ESCROW_MNEMONIC, 'team1', 'team2', limitDate, endDate, fixedFee);


    // 3. users optin dapp
    await core.fakeUserOptinApp(USER1_MNEMONIC, dapp.appId);
    await core.fakeUserOptinApp(USER2_MNEMONIC, dapp.appId);


    console.log('\nPrint assets info of escrow and users before betting\n');
    console.log('escrow assets = ', await core.getAccountAssetInfo(ESCROW_ADDRESS, core.usdcAssetId));
    console.log('user1 assets = ', await core.getAccountAssetInfo(USER1_ADDRESS, core.usdcAssetId));
    console.log('user2 assets = ', await core.getAccountAssetInfo(USER2_ADDRESS, core.usdcAssetId));


    // 4. users bet
    await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
    await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
    await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
    await core.fakeUserBet(USER1_MNEMONIC, dapp.appId, 200*1000, 'team1', dapp.escrow.addr);
    await core.fakeUserBet(USER2_MNEMONIC, dapp.appId, 200*1000, 'team2', dapp.escrow.addr);


    console.log('\nPrint assets info of escrow and users after betting\n');
    console.log('escrow assets = ', await core.getAccountAssetInfo(ESCROW_ADDRESS, core.usdcAssetId));
    console.log('user1 assets = ', await core.getAccountAssetInfo(USER1_ADDRESS, core.usdcAssetId));
    console.log('user2 assets = ', await core.getAccountAssetInfo(USER2_ADDRESS, core.usdcAssetId));


    // 5. admin sets winner to team2
    await core.setWinner(ADMIN_MNEMONIC, dapp.appId, 'team2', dapp.limitDate);


    console.log('\nPrint assets info of escrow and users before claim/reclaim\n');
    console.log('escrow assets = ', await core.getAccountAssetInfo(ESCROW_ADDRESS, core.usdcAssetId));
    console.log('user1 assets = ', await core.getAccountAssetInfo(USER1_ADDRESS, core.usdcAssetId));
    console.log('user2 assets = ', await core.getAccountAssetInfo(USER2_ADDRESS, core.usdcAssetId));


    // cancel: users will recalim immediately
    // other: users who bet on winner will claim winnings
    if (arg0 && arg0.toLowerCase() === 'cancel') {
      // 6. all users reclaim theirs
      await core.fakeUserReclaim(USER1_MNEMONIC, dapp, 800*1000, true);
      await core.fakeUserReclaim(USER2_MNEMONIC, dapp, 200*1000, true);
    } else {
      // 6. user2 claim his(her) winnings
      await core.fakeUserClaim(USER2_MNEMONIC, dapp, 200*1000, 200*1000, 800*1000);


      console.log('\nPrint assets info of escrow and user1 after claim/reclaim\n');
      console.log('escrow assets = ', await core.getAccountAssetInfo(ESCROW_ADDRESS, core.usdcAssetId));
      console.log('user1 assets = ', await core.getAccountAssetInfo(USER1_ADDRESS, core.usdcAssetId));
      console.log('user2 assets = ', await core.getAccountAssetInfo(USER2_ADDRESS, core.usdcAssetId));
    }

    // 7. admin deletes dapp
    await core.deleteDappById(ADMIN_MNEMONIC, dapp.appId);  
  }


  console.log('\n\nAll done!\n\n')
}


test(process.argv.slice(2));
