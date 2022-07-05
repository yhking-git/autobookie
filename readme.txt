1. install docker
2. install sandbox
	in terminal
		git clone https://github.com/algorand/sandbox.github
3. run testnet
	move to sandbox directory
	in terminal run below for the first time
		./sandbox up testnet
  next time run below
    ./sandbox up
	wait for a while



4. install nodejs v16
	npm install

5. to test backend
	cd src
	node test-backend

6. to test frontend
	npm start

7. frontend api creation
  - for TestNet
    wrapper = new api.AlgoSignerWrapper('TestNet',
                                        'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
                                        'https://testnet-algorand.api.purestake.io/ps2',
                                        'https://testnet-algorand.api.purestake.io/idx2');
  - for MainNet
    wrapper = new api.AlgoSignerWrapper('MainNet',
                                        'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
                                        'https://mainnet-algorand.api.purestake.io/ps2',
                                        'https://mainnet-algorand.api.purestake.io/idx2');

8. backend api creation
  - for Sandbox
  	let core = new api.AutobookieCore('Sandbox', undefined, undefined, undefined);
  - for 3rd party TestNet
    let core = new api.AutobookieCore('TestNet',
                                    'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
                                    'https://testnet-algorand.api.purestake.io/ps2',
                                    'https://testnet-algorand.api.purestake.io/idx2');
  - for 3rd party MainNet
    let core = new api.AutobookieCore('MainNet',
                                    'lxbjS3nPrM94Xt1KyNv7iIFlZTURUtX3Lc3WFLqc',
                                    'https://mainnet-algorand.api.purestake.io/ps2',
                                    'https:/mainnet-algorand.api.purestake.io/idx2');

9. app creation on backend
(method) AutobookieCore.createDapp(creatorMnemonic: string,
                                   escrowMnemonic: string,
								   team1: string,
								   team2: string,
								   limitDate: number,
								   endDate: number,
								   fixedFee: number): AutobookieDapp
