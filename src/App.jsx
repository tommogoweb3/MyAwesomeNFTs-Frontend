import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ethers } from "ethers";
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import myAwesomeNFTs from './utils/MyAwesomeNFTs.json';

// Constants
const { ethereum } = window;
const TWITTER_HANDLE = 'tommogoweb3';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const OPENSEA_LINK = 'https://testnets.opensea.io/collection/3-awesome-words-v2';
const CONTRACT_ADDRESS = "0xa560c9c9A3646e5209eE5B1d9BAc98D724606D6e";
const CONTRACT_ETHERSCAN = `https://rinkeby.etherscan.io/address/${CONTRACT_ADDRESS}#code`;
const FAUCET_MYCRYPTO = "https://app.mycrypto.com/faucet";
const FAUCET_ETHILY = "https://ethily.io/rinkeby-faucet/";
const FAUCET_RINKEBY = "https://faucet.rinkeby.io/";
const REACT_HOT_TOAST = "https://react-hot-toast.com/";
const GITHUB = "https://github.com/tommogoweb3";


const App = () => {

  const [currentAccount, setCurrentAccount] = useState(""); // state variable to store user's public wallet
  const [minted, setMinted] = useState(0); // state variable to store actual mint count
  const [transactionId, setTransactionId] = useState(""); // state variable for txn hash
  const [tokenId, setTokenId] = useState(""); // state variable for tokenId

  const connectToContract = async () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myAwesomeNFTs.abi, signer);
    return connectedContract;
  }

  const updateMintedSoFar = async () => {
    try {
      if (ethereum) {
        const connectedContract = await connectToContract();
        
        const mintedSoFar = await connectedContract.mintedSoFar();
        setMinted(mintedSoFar.toNumber());
        console.log("Mint count updated");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  }

  const checkIfWalletIsConnected = async () => {
    if (!ethereum) {
      console.log("Make sure you have Metamask!");
      return;
    } else {
      console.log("We have ethereum object", ethereum);
    }
    // check if we are athuorized to access the user's Wallet
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account);
      toast.success("Connected with " + account);
      setupEventListener();
      updateMintedSoFar();
    } else {
      console.log("No athuorized account found");
    }
  }

  const connectWallet = async () => {
      if (!ethereum) {
        toast.error("Please install Metamask to connect!");
        return;
      }
      const toastId = toast.loading("Connecting wallet...");
      // request access to account
      await ethereum
      .request({ method: "eth_requestAccounts" })
      .then(async () => {
        toast.success("Nice! Wallet connected!", { id: toastId });
        const accounts = await ethereum.request({ method: "eth_accounts" });
        console.log("Connected:", accounts[0]);
        setCurrentAccount(accounts[0]);
        setupEventListener();
        updateMintedSoFar();
      })
      .catch((err) => {
        if (err.code === 4001) {
          toast.error("User rejected the connection!", { id: toastId });
          return;
        } else {
          console.log("Error occured: ", err);
          toast.error("Failed to connect wallet.", { id: toastId });
          return;
      }
      });
  }

  const checkAndSwitchChain = async () => {
    const chainId = await ethereum.request({ method: "eth_chainId" });
    console.log("Currently connected to chain" + chainId);
    // rinkeby chain id 0x4
    if (chainId !== "0x4") {
      console.log("Please connect to Rinkeby");
      const chainToast = toast.loading("Please connect to Rinkeby Testnet...");

      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x4" }]
      }).then(() => {
        console.log("Successfully connected to chain" + chainId);
        toast.success("Successfully connected to Rinkeby Testnet!", { id: chainToast });
        updateMintedSoFar();
        return "success";
      }).catch((error) => {
        console.log(error);
        toast.error("Failed to connect to Rinkeby Testnet.", { id: chainToast });
        return "failed";
      })
    }
  }

  const setupEventListener = async () => {
    try {
      const chainCheckResult = await checkAndSwitchChain();
      if (chainCheckResult === "failed") {
        console.log("Unable to connect to Rinkeby, therefore event listener could not be set up");
        return;
      }
      if (ethereum) {
        const connectedContract = await connectToContract();
        connectedContract.on("NewAwesomeNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber());
          console.log(`A new NFT was minted: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`);
          setTokenId(tokenId.toNumber());
          updateMintedSoFar();
        });
        console.log("Event listener triggered! Yay");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const askContractToMintNFT = async () => {
    try {
      if (ethereum) {
        const connectedContract = await connectToContract();

        const chainCheckResult = await checkAndSwitchChain();
        if (chainCheckResult === "failed") {
          console.log("Unable to connect to Rinkeby");
          return;
        }

        const toastId = toast.loading("Pls approve transaction in Metamask...");
        console.log("Prompting wallet to pay gas");
        let nftTxn = await connectedContract.makeAnAwesomeNFT();

        toast.loading("Transaction is being mined...", {
          id: toastId,
          duration: Infinity
        })
        console.log("Mining... Please wait.")

        await nftTxn.wait();
        toast.success("Mined successfully!", {
          id: toastId,
          duration: 3000
        })
        console.log(`Mined! See transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);

        setTransactionId(nftTxn.hash);
        updateMintedSoFar();
        setupEventListener();
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
      toast.dismiss();
      toast.error("Error occured, check console");
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  // Render Methods
  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet} className="cta-button connect-wallet-button">
      Connect Wallet
    </button>
  );
  const renderMintUI = () => (
    <button onClick={askContractToMintNFT} className="cta-button mint-button">
      Mint NFT
    </button>
  );

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <Toaster
					  position='top-left'
					  toastOptions={{
						style: {
							background: "grey",
							color: "#fff",
							maxWidth: "800px",
							textAlign: "left",
						}
					}}
				  />
          <p className="header gradient-text">Tommogo's Awesome NFT Collection</p>
          <p className="sub-text">
            Each unique. Each beautifully crafted. Discover your NFT today.
          </p>
          <p className="footer-text"> 
            View Collection on {" "}
            <a className="footer-text" href={OPENSEA_LINK} target="_blank" rel="noreferrer">
              Opensea
            </a>
          </p>
          {currentAccount ? <p className="mint-count">({minted} OF 50 MINTED)</p> : ""}
          {currentAccount === "" ? renderNotConnectedContainer() : renderMintUI()}
          {currentAccount ? <p className="footer-text"> Connected with {currentAccount} </p> : ""}
          {transactionId && (
            <p className="footer-text">
              {`View transaction details on `}
              <a className="footer-text" href={ "https://rinkeby.etherscan.io/tx/" + transactionId } target="_blank" rel="noreferrer">
              Etherscan
              </a>
            </p>
          )}
          {tokenId && (
            <p className="footer-text">
              {`View your NFT on `}
              <a className="footer-text" href={ "https://testnets.opensea.io/assets/" + CONTRACT_ADDRESS + "/" + tokenId } target="_blank" rel="noreferrer">
              Opensea
              </a>
            </p>
          )}
          
        </div>
        <div className="body-container">
          <p>
          <a className="gradient-text bold-text"> Project Feature Highlights</a> </p>
          <p> {`This is a sample NFT project inspired by _buildspace. It is currently deployed on Rinkeby Ethereum Testnet, pls make sure Metamask is connected to Rinkeby! You'll also need Rinkeby ETH to cover gas fees when minting - here are a few options to request Rinkeby ETH deposit into your wallet for free: `} 
          <a className="footer-text" href={FAUCET_MYCRYPTO} target="_blank" rel="noreferrer">MyCrypto Faucet</a>{", "}
          <a className="footer-text" href={FAUCET_ETHILY} target="_blank" rel="noreferrer">Ethily Faucet</a>{", "}
          <a className="footer-text" href={FAUCET_RINKEBY} target="_blank" rel="noreferrer">Rinkeby Faucet</a>{"."}
          </p>
          <p>Each NFT in this collection consists of a 3-word string and background colour, both randomly generated at the time of mint, with data stored fully on-chain.</p>
          <p>Developed backend using Hardhat development environment (Solidity & Javascripts) and frontend using Replit IDE (Javascript, HTML, CSS, React.js, Ethers.js)</p>
          <p>Prompting Metamask to sign in with "Connect Wallet". If user is not connected to Rinkeby Testnet, prompting Metamask to switch chain to Rinkeby.</p>
          <p>Implemented dynamic notification system with loading animations, success and error messages to update user when connecting to site, swithcing chain, and minting (loading message until transaction is mined) using <a className="footer-text" href={REACT_HOT_TOAST} target="_blank" rel="noreferrer">React Hot Toast</a>{". "}  </p>
          <p>Smart Contract has been verified on Etherscan, see link below.</p>
          <p>Once connected:</p>
          <p>Displaying signed in user address (0x...) on site using React state variable.</p>
          <p>Displaying live mint-count using React state variable that updates upon Smart Contract Event triggers.</p>
          <p>Dynamically replacing "Connect Wallet" with "Mint NFT" button.</p>
          <p>Upon successful mint, displaying Etherscan link to transaction details, and Opensea link to minted NFT.</p>
          <p>Thank you for checking out my sample NFT collection & Dapp! Feel free to check out the Smart Contract Code on Etherscan, my GitHub page (links below), an if you're here already, would love to connect on Twitter:) </p>
        </div>
        <div className="footer-container">
          

          <div className="footer-item">
          <p>
          <a className="footer-item gradient-text" href={CONTRACT_ETHERSCAN} target="_blank" rel="noreferrer">
          Verified Smart Contract
          </a>
          </p>
          </div>

          <div className="footer-item">
          <p>
          <a className="footer-item gradient-text" href={GITHUB} target="_blank" rel="noreferrer">
          GitHub
          </a>
          </p>
          </div>

          <div className="footer-item">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-item gradient-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
          </div>

          
        </div>
        
      </div>
    </div>
  );
};

export default App;