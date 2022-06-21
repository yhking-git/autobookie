const api = require('./api.js');


main();


async function main() {
  const args = (process.argv.slice(2));

  if (args.length == 0) {
    console.log('Usage: node cli.js <command> <args>');
    console.log('Commands:');
    console.log('  list');
    console.log('  create mnemonic team1 team2 limitDate endDate');
    console.log('  delete mnemonic appId [closeOut=true]');
    console.log('  info');
    console.log('  winner mnemonic, appId, teamName');
    console.log('  test');
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case 'create':
      if (commandArgs.length == 5) {
        await api.dappCreate(commandArgs[0], commandArgs[1], commandArgs[2], parseInt(commandArgs[3]), parseInt(commandArgs[4]));
      } else {
        console.log('Usage: node cli.js create mnemonic team1 team2 limitDate endDate');
      }
      break;
    case 'delete':
      if (commandArgs.length == 2) {
        await api.dappDelete(commandArgs[0], parseInt(commandArgs[1]));
      } else {
        console.log('Usage: node cli.js delete mnemonic appId');
      }
      break;
    case 'info':
      console.log(api.getAppInfo(args.appId));
      break;
    case 'test':
      await test();
      break;
    case 'winner':
      if (commandArgs.length == 3) {
        api.setWinner(commandArgs[0], commandArgs[1], commandArgs[2]);
      } else {
        console.log('Usage: node cli.js winner mnemonic, appId, teamName');
      }
      break;
    default:
      console.log('Unknown command:', command);
  }
}


/**
 * simulate all workflow
 */
async function test() {

  // admin creates dapp
  const {appId, escrow, txId} = await api.dappCreate(process.env.ADMIN_MNEMONIC, 'team1', 'team2', api.dateToTimestamp('2022-05-29'), api.dateToTimestamp('2022-05-30'));

  await api.bet(process.env.USER1_MNEMONIC, appId, escrow, 20000, 'team1');
  await api.bet(process.env.USER2_MNEMONIC, appId, escrow, 10000, 'team1');
  await api.bet(process.env.USER3_MNEMONIC, appId, escrow, 10000, 'team2');

  // // admin sets winner to team2
  // api.setWinner(process.env.ADMIN_MNEMONIC, 89856793, 'team2');
  api.setWinner(process.env.ADMIN_MNEMONIC, appId, 'team2');

  // // user3 claim his winnings
  // await api.claim(process.env.USER3_MNEMONIC, 89856793, 10000, 10000, 30000);
  await api.claim(process.env.USER3_MNEMONIC, appId, 10000, 10000, 30000);

  // // admin deletes dapp
  // await api.dappDelete(process.env.ADMIN_MNEMONIC, 89868859);
  await api.dappDelete(process.env.ADMIN_MNEMONIC, appId);
}
