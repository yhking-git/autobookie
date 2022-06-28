import './App.css';
import { useState } from 'react';
import * as api from './api-front'

/** @type {api.AlgoSignerWrapper} */
let wrapper;

function App() {
  let prepared = false;
  const [address, setAddress] = useState("WYEGVAN3QSZLGXMOMKEEVNXIJFVAQTTEBEQ2NRFDPCZ3HHJZKBHGOU7UPU");
  const [appId, setAppId] = useState(97542127);
  const [bettingAmount, setBettingAmount] = useState(200*1000);
  const [team, setTeam] = useState("team2");
  const [myBet, setMyBet] = useState(200*1000);
  const [myTeamTotal, setMyTeamTotal] = useState(200*1000);
  const [otherTeamTotal, setOtherTeamTotal] = useState(800*1000);

  const onPrepareBettingClick = async () => {
    if (prepared === true) return;
  
    prepared = true;

    wrapper = new api.AlgoSignerWrapper("TestNet", api.USDC_ASSET_ID_TESTNET, 20*1000);
    await wrapper.userPrepareBetting(address, appId);
  }

  const onBetClick = async () => {
    await wrapper.userBet(address, appId, bettingAmount, team);
  }

  const onClaimClick = async () => {
    await wrapper.userClaim(address, appId, myBet, myTeamTotal, otherTeamTotal);
  }

  return (
    <div className="App">
        <div className="input-form">
        <label htmlFor="address">Address:</label>
        <input value={address} name="team" onChange={e => setAddress(e.target.value)} />
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
