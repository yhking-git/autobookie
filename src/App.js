import './App.css';
import { useState } from 'react';
import * as api from './api-front'

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

let asw;

function App() {
  let prepared = false;
  const [mnemonic, setMnemonic] = useState("");
  const [appId, setAppId] = useState(0);
  const [bettingAmount, setBettingAmount] = useState(0);
  const [team, setTeam] = useState("");
  const [escrowAddr, setEscrowAddr] = useState("");
  const [escrowSk, setEscrowSk] = useState("");
  const [myBet, setMyBet] = useState(0);
  const [myTeamTotal, setMyTeamTotal] = useState(0);
  const [otherTeamTotal, setOtherTeamTotal] = useState(0);

  const onPrepareBettingClick = async () => {
    if (prepared === true) return;
  
    prepared = true;

    asw = new api.AlgoSignerWrapper("TestNet", 10458941, 20*1000);
    await asw.userPrepareBetting(mnemonic, appId);
  }

  const onBetClick = async () => {
    await asw.userBet(mnemonic, appId, bettingAmount, team, escrowAddr);
  }

  const onClaimClick = async () => {
    await asw.userClaim(mnemonic, appId, escrowAddr, escrowSk, myBet, myTeamTotal, otherTeamTotal);
  }

  return (
    <div className="App">
      <div className="input-form">
        <label htmlFor="mnemonic">Mnemonic:</label>
        <input value={mnemonic} name="mnemonic" onChange={e => setMnemonic(e.target.value)} />
      </div>
      <div className="input-form">
        <label htmlFor="app-id">AppId:</label>
        <input value={appId} name="app-id" onChange={e => setAppId(e.target.value)} />
      </div>
      <button onClick={() => onPrepareBettingClick()}>Prepare Betting</button>
      <div className="input-form">
        <label htmlFor="betting-amount">Betting Amount:</label>
        <input value={bettingAmount} name="betting-amount" onChange={e => setBettingAmount(e.target.value)} />
      </div>
      <div className="input-form">
        <label htmlFor="team">Team:</label>
        <input value={team} name="team" onChange={e => setTeam(e.target.value)} />
      </div>
      <div className="input-form">
        <label htmlFor="escrow-address">Escrow Address:</label>
        <input value={escrowAddr} name="team" onChange={e => setEscrowAddr(e.target.value)} />
      </div>
      <div className="input-form">
        <label htmlFor="escrow-sk">Escrow Sk:</label>
        <input value={escrowSk} name="team" onChange={e => setEscrowSk(e.target.value)} />
      </div>
      <button onClick={() => onBetClick()}>Bet</button>
      <div className="input-form">
        <label htmlFor="my-bet">My Bet:</label>
        <input value={myBet} name="team" onChange={e => setMyBet(e.target.value)} />
      </div>
      <div className="input-form">
        <label htmlFor="my-team-total">My Team Total:</label>
        <input value={myTeamTotal} name="team" onChange={e => setMyTeamTotal(e.target.value)} />
      </div>
      <div className="input-form">
        <label htmlFor="other-team-total">Other Team Total:</label>
        <input value={otherTeamTotal} name="team" onChange={e => setOtherTeamTotal(e.target.value)} />
      </div>
      <button onClick={() => onClaimClick()}>Claim</button>
    </div>
  );
}

export default App;
