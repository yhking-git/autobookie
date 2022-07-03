import './App.css';
import { useState } from 'react';
import * as api from './api-front'

/** @type {api.AlgoSignerWrapper} */
var wrapper;

// const USER2_ADDRESS="WYEGVAN3QSZLGXMOMKEEVNXIJFVAQTTEBEQ2NRFDPCZ3HHJZKBHGOU7UPU"
// const USER2_MNEMONIC="piece another expect relax practice april thunder sail danger limb magnet rare island walk project claw cook soda life lend come feature grab able absurd"

function App() {
  let optedIn = false;
  const [address, setAddress] = useState("WYEGVAN3QSZLGXMOMKEEVNXIJFVAQTTEBEQ2NRFDPCZ3HHJZKBHGOU7UPU");
  const [appId, setAppId] = useState(97892527);
  const [fixedFee, setFixedFee] = useState(100*1000);
  const [bettingAmount, setBettingAmount] = useState(200*1000);
  const [team, setTeam] = useState("team2");
  const [myBet, setMyBet] = useState(200*1000);
  const [myTeamTotal, setMyTeamTotal] = useState(200*1000);
  const [otherTeamTotal, setOtherTeamTotal] = useState(800*1000);

  const onOptinAppClick = async () => {
    if (optedIn === true) return;
  
    optedIn = true;

    wrapper = new api.AlgoSignerWrapper("TestNet", api.USDC_ASSET_ID_TESTNET, fixedFee);
    await wrapper.optinApp(address, appId);
  }

  const onBetClick = async () => {
    await wrapper.bet(address, appId, bettingAmount, team);
  }

  const onRefreshAppInfoClick = async () => {
    const globalInfo = wrapper.getAppInfoGlobal(appId);
    console.log(JSON.stringify(globalInfo, undefined, 2));

    const localInfo = wrapper.getAppInfoLocal(address, appId);
    console.log(JSON.stringify(localInfo, undefined, 2));
  }

  const onClaimClick = async () => {
    await wrapper.claim(address, appId, myBet, myTeamTotal, otherTeamTotal);
  }

  return (
    <div className="App">
        <div className="input-form">
        <label htmlFor="address">Address:</label>
        <input value={address} name="team" onChange={e => setAddress(e.target.value)} />
      </div>
      <div className="input-form">
        <label htmlFor="app-id">AppId:</label>
        <input value={appId} name="app-id" onChange={e => setAppId(parseInt(e.target.value))} />
      </div>
      <div className="input-form">
        <label htmlFor="fixed-fee">fixedFee:</label>
        <input value={fixedFee} name="app-id" onChange={e => setFixedFee(parseInt(e.target.value))} />
      </div>
      <button onClick={() => onOptinAppClick()}>Optin App</button>
      <div className="input-form">
        <label htmlFor="betting-amount">Betting Amount:</label>
        <input value={bettingAmount} name="betting-amount" onChange={e => setBettingAmount(parseInt(e.target.value))} />
      </div>
      <div className="input-form">
        <label htmlFor="team">Team:</label>
        <input value={team} name="team" onChange={e => setTeam(e.target.value)} />
      </div>
      <div>
        <button onClick={() => onBetClick()}>Bet</button>
      </div>
      <div>
        <button onClick={() => onRefreshAppInfoClick()}>Refresh App Info</button>
      </div>
      <div className="input-form">
        <label htmlFor="my-bet">My Bet:</label>
        <input value={myBet} name="team" onChange={e => setMyBet(parseInt(e.target.value))} />
      </div>
      <div className="input-form">
        <label htmlFor="my-team-total">My Team Total:</label>
        <input value={myTeamTotal} name="team" onChange={e => setMyTeamTotal(parseInt(e.target.value))} />
      </div>
      <div className="input-form">
        <label htmlFor="other-team-total">Other Team Total:</label>
        <input value={otherTeamTotal} name="team" onChange={e => setOtherTeamTotal(parseInt(e.target.value))} />
      </div>
      <button onClick={() => onClaimClick()}>Claim</button>
    </div>
  );
}

export default App;
