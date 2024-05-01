import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import WalletLink from "walletlink";
import { ethers } from "ethers";

import contractAbi from "../../utils/nft.json";
import signatures from "../../utils/signatures.json";

import ethLogo from "../../assets/images/Ethereum.png";
import ethGif from "../../assets/images/Ethereum.gif";

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      infuraId: "9aa3d95b3bc440fa88ea12eaa4456161",
    },
  },
  walletlink: {
    package: WalletLink,
    options: {
      appName: "Monkai",
      infuraId: "9aa3d95b3bc440fa88ea12eaa4456161",
      chainId: 1,
    },
  },
};

const web3Modal = new Web3Modal({
  network: "mainnet",
  providerOptions,
});

const contractAddress = "0xE2eBD6B835d4284190ef55C884De1632b6dE8a52";

const unitPrice = 0.08;
const maxSupply = 3333;

const preSaleMaxPerTx = 3;
const publicSaleMaxPerTx = 50;

const ETHMint = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  const [signer, setSigner] = useState(null);
  const contract = useRef();

  const [totalSupply, setTotalSupply] = useState();

  const [preSaleStart, setPreSaleStart] = useState();
  const [publicSaleStart, setPublicSaleStart] = useState();

  const preSaleStartTimeout = useRef();
  const publicSaleStartTimeout = useRef();

  const [preSaleIsActive, setPreSaleIsActive] = useState(false);
  const [publicSaleIsActive, setPublicSaleIsActive] = useState(false);

  const [totalMintedByAddress, setTotalMintedByAddress] = useState();

  const maxPerAccount = publicSaleIsActive
    ? publicSaleMaxPerTx
    : preSaleMaxPerTx;

  const maxAllowed = Math.max(0, maxPerAccount - (totalMintedByAddress ?? 0));

  const active = !!signer;

  const [amount, setAmount] = useState(1);

  const [stakeAnimation, setStakeAnimation] = useState(false)

  const handleDecrease = () => {
    if (amount > 1) setAmount(amount - 1);
  };

  const handleIncrease = () => {
    if (amount < maxAllowed) setAmount(amount + 1);
  };

  const getMintedByUser = async () => {
    const fromBlock = 0;
    const account = await signer.getAddress();

    let count = 0;

    const transferSingleEvents = await contract.current.queryFilter(
      "Transfer",
      fromBlock,
      "latest"
    );

    for (const event of transferSingleEvents) {
      if (event.args.to.toLowerCase() === account.toLowerCase()) count++;
    }

    setTotalMintedByAddress(count);

    return count;
  };

  const fetchState = async () => {
    setIsLoading(true);

    setTotalSupply(await contract.current.totalSupply());

    setPreSaleStart((await contract.current.preSaleStartDate()) * 1000);
    setPublicSaleStart((await contract.current.publicSaleStartDate()) * 1000);

    await getMintedByUser();

    setIsLoading(false);
  };

  const handleConnectWallet = async () => {
    try {
      const instance = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(instance);

      setSigner(provider.getSigner());
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreSaleMint = async () => {
    console.log("Pre-sale mint");

    setIsMinting(true);

    try {
      const account = await signer.getAddress();
      const [v, r, s] = signatures[account.toLowerCase()];

      const tx = await contract.current.preSaleMint(v, r, s, 1, {
        value: ethers.utils.parseUnits(unitPrice.toString(), 18),
      });

      await tx.wait();

      toast.success("Minted successfully.");
      setStakeAnimation(true)
    } catch (err) {
      console.error(err);
      console.log(err.code, err.message.substring(5));

      if (err.code && err.code === "INSUFFICIENT_FUNDS") {
        toast.error("Insufficient funds.");
      } else if (err.code && err.code === 4001) {
        toast.error("Transaction signature was denied.");
      } else {
        toast.error("Minting failed.");
      }
    }

    setIsMinting(false);
  };

  const handlePublicSaleMint = async () => {
    console.log("Public sale mint");

    setIsMinting(true);

    try {
      const tx = await contract.current.mint(amount, {
        value: ethers.utils.parseUnits(
          (unitPrice * amount).toFixed(2).toString(),
          18
        ),
      });

      await tx.wait();

      toast.success("Minted successfully.");
      setStakeAnimation(true)
    } catch (err) {
      console.error(err);
      console.log(err.code, err.message.substring(5));

      if (err.code && err.code === "INSUFFICIENT_FUNDS") {
        toast.error("Insufficient funds.");
      } else if (err.code && err.code === 4001) {
        toast.error("Transaction signature was denied.");
      } else {
        toast.error("Minting failed.");
      }
    }

    setIsMinting(false);
  };

  useEffect(() => {
    if (!signer) return;

    (async () => {
      contract.current = new ethers.Contract(
        contractAddress,
        contractAbi,
        signer
      );

      // const account = await signer.getAddress();
      setIsWhitelisted(true);

      contract.current.on("Transfer", async () => {
        fetchState();
      });

      fetchState();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer]);

  useEffect(() => {
    if (!preSaleStart) return;

    const now = Date.now();

    // Remove current timeout if there is any
    if (preSaleStartTimeout.current) clearTimeout(preSaleStartTimeout.current);

    // Set timeout for pre-sale start
    preSaleStartTimeout.current = setTimeout(() => {
      setPreSaleIsActive(true);
    }, Math.max(preSaleStart - now, 0));
  }, [preSaleStart]);

  useEffect(() => {
    if (!publicSaleStart) return;

    const now = Date.now();

    // Remove current timeout if there is any
    if (publicSaleStartTimeout.current)
      clearTimeout(publicSaleStartTimeout.current);

    // Set timeout for public sale start
    publicSaleStartTimeout.current = setTimeout(() => {
      setPublicSaleIsActive(true);
    }, Math.max(publicSaleStart - now, 0));
  }, [publicSaleStart]);

  return (
    <>
      <div id="ape-number">
        <div id="minus" onClick={handleDecrease}>
          <svg
            width="16"
            height="2"
            viewBox="0 0 16 2"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 0H1C0.734784 0 0.48043 0.105357 0.292893 0.292893C0.105357 0.48043 0 0.734784 0 1C0 1.26522 0.105357 1.51957 0.292893 1.70711C0.48043 1.89464 0.734784 2 1 2H15C15.2652 2 15.5196 1.89464 15.7071 1.70711C15.8946 1.51957 16 1.26522 16 1C16 0.734784 15.8946 0.48043 15.7071 0.292893C15.5196 0.105357 15.2652 0 15 0Z"
              fill="white"
            />
          </svg>
        </div>

        <h5>{amount}</h5>

        <div id="plus" onClick={handleIncrease}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 7H9V1C9 0.734784 8.89464 0.48043 8.70711 0.292893C8.51957 0.105357 8.26522 0 8 0C7.73478 0 7.48043 0.105357 7.29289 0.292893C7.10536 0.48043 7 0.734784 7 1V7H1C0.734784 7 0.48043 7.10536 0.292893 7.29289C0.105357 7.48043 0 7.73478 0 8C0 8.26522 0.105357 8.51957 0.292893 8.70711C0.48043 8.89464 0.734784 9 1 9H7V15C7 15.2652 7.10536 15.5196 7.29289 15.7071C7.48043 15.8946 7.73478 16 8 16C8.26522 16 8.51957 15.8946 8.70711 15.7071C8.89464 15.5196 9 15.2652 9 15V9H15C15.2652 9 15.5196 8.89464 15.7071 8.70711C15.8946 8.51957 16 8.26522 16 8C16 7.73478 15.8946 7.48043 15.7071 7.29289C15.5196 7.10536 15.2652 7 15 7Z"
              fill="white"
            />
          </svg>
        </div>

        <h5 id="ape-max">3 Max</h5>
      </div>
      {active ? (
        isLoading ? (
          <button className="purchase-button" disabled>
            Loading...
          </button>
        ) : publicSaleIsActive ? (
          totalSupply === maxSupply ? (
            <button className="purchase-button" disabled>
              Ethereum Sold Out
            </button>
          ) : (
            <button
              className="purchase-button"
              onClick={handlePublicSaleMint}
              disabled={isMinting || totalMintedByAddress >= publicSaleMaxPerTx}
            >
              <img className="purchase-button-logo eth" src={ethLogo} alt="ETH Logo"/>
              <img className="purchase-button-gif eth" src={ethGif} alt="ETH Gif"/>
              {isMinting
                ? "Minting..."
                : totalMintedByAddress >= publicSaleMaxPerTx
                ? "Maximum limit reached"
                : "Mint Ethereum"}
            </button>
          )
        ) : preSaleIsActive ? (
          totalSupply === maxSupply ? (
            <button className="purchase-button" disabled>
              Sold Out
            </button>
          ) : isWhitelisted ? (
            <button
              className="purchase-button"
              onClick={handlePreSaleMint}
              disabled={isMinting || totalMintedByAddress >= preSaleMaxPerTx}
            >
              {isMinting
                ? "Minting..."
                : totalMintedByAddress >= preSaleMaxPerTx
                ? "Maximum limit reached"
                : "Mint Ethereum"}
            </button>
          ) : (
            <button className="purchase-button" disabled>
              Whitelist Mint
            </button>
          )
        ) : (
          <button className="purchase-button" disabled>
            Not Active
          </button>
        )
      ) : (
        <button className="purchase-button" onClick={handleConnectWallet}>
          <img className="purchase-button-logo eth" src={ethLogo} alt="ETH Logo"/>
          <img className="purchase-button-gif eth" src={ethGif} alt="ETH Gig"/>
          Connect Ethereum
        </button>
      )}
      <a href="https://monkainft.com/stake" className="stake-button">
        <button className={`purchase-button ${stakeAnimation && "purchase-button-stake-animation"}`}>
          Stake
        </button>
      </a>
    </>
  );
};

export default ETHMint;
