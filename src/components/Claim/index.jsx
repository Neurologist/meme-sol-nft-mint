import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletModalButton } from "@solana/wallet-adapter-react-ui";
import { GatewayProvider } from "@civic/solana-gateway-react";

import ETHMint from "./ETHMint";

import solLogo from "../../assets/images/Solana.png";
import solGif from "../../assets/images/Solana.gif";


import {
  awaitTransactionSignatureConfirmation,
  CANDY_MACHINE_PROGRAM,
  createAccountsForMint,
  getCandyMachineState,
  getCollectionPDA,
  mintOneToken,
} from "../../utils/candy-machine";
import { getAtaForMint, toDate } from "../../utils/utils";

import GetPrice from "../GetPrice/GetPrice";
import hero from "./../../assets/images/hero.mp4";

import SolanaIcon from "../../assets/icons/SolanaIcon";
import CopyIcon from "../../assets/icons/CopyIcon";
import ArrowIcon from "../../assets/icons/ArrowIcon";
import Tick from "../../assets/icons/Tick";

import { MintButton } from "./MintButton";

import "./Claim.css";

const SOLANA_ADDRESS = "8NEPX4C8CEtnAEUUhsLc6rBX8V99sNwCdAicybrZa9UB";
const SOLANA_EXPLORER_ADDRESS =
  "https://explorer.solana.com/address/8NEPX4C8CEtnAEUUhsLc6rBX8V99sNwCdAicybrZa9UB?cluster=mainnet-beta";

const ALLOWLIST_PRICE = 1;
const PUBLIC_PRICE = 1.5;

const Claim = (props) => {
  const [copyingAddress, SetCopyingAdrress] = useState(false);

  const [isUserMinting, setIsUserMinting] = useState(false);
  const [candyMachine, setCandyMachine] = useState();
  const [isActive, setIsActive] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [endDate, setEndDate] = useState();
  const [itemsRemaining, setItemsRemaining] = useState();
  const [isWhitelistUser, setIsWhitelistUser] = useState(false);
  const [isPresale, setIsPresale] = useState(false);
  const [isValidBalance, setIsValidBalance] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [discountPrice, setDiscountPrice] = useState();
  const [needTxnSplit, setNeedTxnSplit] = useState(true);
  const [setupTxn, setSetupTxn] = useState();

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();
  const cluster = props.network;
  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    };
  }, [wallet]);

  const refreshCandyMachineState = useCallback(
    async (commitment = "confirmed") => {
      if (!anchorWallet) {
        return;
      }
      if (props.error !== undefined) {
        toast.error(props.error);
        return;
      }

      const connection = new Connection(props.rpcHost, commitment);

      if (props.candyMachineId) {
        try {
          const cndy = await getCandyMachineState(
            anchorWallet,
            props.candyMachineId,
            connection
          );
          console.log("Candy machine state: ", cndy);
          let active = cndy?.state.goLiveDate
            ? cndy?.state.goLiveDate.toNumber() < new Date().getTime() / 1000
            : false;
          let presale = false;

          // duplication of state to make sure we have the right values!
          let isWLUser = false;
          let userPrice = cndy.state.price;

          // whitelist mint?
          if (cndy?.state.whitelistMintSettings) {
            // is it a presale mint?
            if (
              cndy.state.whitelistMintSettings.presale &&
              (!cndy.state.goLiveDate ||
                cndy.state.goLiveDate.toNumber() > new Date().getTime() / 1000)
            ) {
              presale = true;
            }
            // is there a discount?
            if (cndy.state.whitelistMintSettings.discountPrice) {
              setDiscountPrice(cndy.state.whitelistMintSettings.discountPrice);
              userPrice = cndy.state.whitelistMintSettings.discountPrice;
            } else {
              setDiscountPrice(undefined);
              // when presale=false and discountPrice=null, mint is restricted
              // to whitelist users only
              if (!cndy.state.whitelistMintSettings.presale) {
                cndy.state.isWhitelistOnly = true;
              }
            }
            // retrieves the whitelist token
            const mint = new anchor.web3.PublicKey(
              cndy.state.whitelistMintSettings.mint
            );
            const token = (
              await getAtaForMint(mint, anchorWallet.publicKey)
            )[0];

            try {
              const balance = await connection.getTokenAccountBalance(token);
              isWLUser = parseInt(balance.value.amount) > 0;
              // only whitelist the user if the balance > 0
              setIsWhitelistUser(isWLUser);

              if (cndy.state.isWhitelistOnly) {
                active = isWLUser && (presale || active);
              }
            } catch (e) {
              setIsWhitelistUser(false);
              // no whitelist user, no mint
              if (cndy.state.isWhitelistOnly) {
                active = false;
              }
              console.log(
                "There was a problem fetching whitelist token balance"
              );
              console.log(e);
            }
          }
          userPrice = isWLUser ? userPrice : cndy.state.price;

          if (cndy?.state.tokenMint) {
            // retrieves the SPL token
            const mint = new anchor.web3.PublicKey(cndy.state.tokenMint);
            const token = (
              await getAtaForMint(mint, anchorWallet.publicKey)
            )[0];
            try {
              const balance = await connection.getTokenAccountBalance(token);

              const valid = new anchor.BN(balance.value.amount).gte(userPrice);

              // only allow user to mint if token balance >  the user if the balance > 0
              setIsValidBalance(valid);
              active = active && valid;
            } catch (e) {
              setIsValidBalance(false);
              active = false;
              // no whitelist user, no mint
              console.log("There was a problem fetching SPL token balance");
              console.log(e);
            }
          } else {
            const balance = new anchor.BN(
              await connection.getBalance(anchorWallet.publicKey)
            );
            const valid = balance.gte(userPrice);
            setIsValidBalance(valid);
            active = active && valid;
          }

          // datetime to stop the mint?
          if (cndy?.state.endSettings?.endSettingType.date) {
            setEndDate(toDate(cndy.state.endSettings.number));
            if (
              cndy.state.endSettings.number.toNumber() <
              new Date().getTime() / 1000
            ) {
              active = false;
            }
          }
          // amount to stop the mint?
          if (cndy?.state.endSettings?.endSettingType.amount) {
            const limit = Math.min(
              cndy.state.endSettings.number.toNumber(),
              cndy.state.itemsAvailable
            );
            if (cndy.state.itemsRedeemed < limit) {
              setItemsRemaining(limit - cndy.state.itemsRedeemed);
            } else {
              setItemsRemaining(0);
              cndy.state.isSoldOut = true;
            }
          } else {
            setItemsRemaining(cndy.state.itemsRemaining);
          }

          if (cndy.state.isSoldOut) {
            active = false;
          }

          const [collectionPDA] = await getCollectionPDA(props.candyMachineId);
          const collectionPDAAccount = await connection.getAccountInfo(
            collectionPDA
          );

          setIsActive((cndy.state.isActive = active));
          setIsPresale((cndy.state.isPresale = presale));
          setCandyMachine(cndy);

          const txnEstimate =
            892 +
            (!!collectionPDAAccount && cndy.state.retainAuthority ? 182 : 0) +
            (cndy.state.tokenMint ? 66 : 0) +
            (cndy.state.whitelistMintSettings ? 34 : 0) +
            (cndy.state.whitelistMintSettings?.mode?.burnEveryTime ? 34 : 0) +
            (cndy.state.gatekeeper ? 33 : 0) +
            (cndy.state.gatekeeper?.expireOnUse ? 66 : 0);

          setNeedTxnSplit(txnEstimate > 1230);
        } catch (e) {
          if (e instanceof Error) {
            if (
              e.message === `Account does not exist ${props.candyMachineId}`
            ) {
              toast.error(
                `Couldn't fetch candy machine state from candy machine with address: ${props.candyMachineId}, using rpc: ${props.rpcHost}! You probably typed the REACT_APP_CANDY_MACHINE_ID value in wrong in your .env file, or you are using the wrong RPC!`
              );
            } else if (
              e.message.startsWith("failed to get info about account")
            ) {
              toast.error(
                `Couldn't fetch candy machine state with rpc: ${props.rpcHost}! This probably means you have an issue with the REACT_APP_SOLANA_RPC_HOST value in your .env file, or you are not using a custom RPC!`
              );
            }
          } else {
            toast.error(`${e}`);
          }
          console.log(e);
        }
      } else {
        toast.error(
          `Your REACT_APP_CANDY_MACHINE_ID value in the .env file doesn't look right! Make sure you enter it in as plain base-58 address!`
        );
      }
    },
    [anchorWallet, props.candyMachineId, props.error, props.rpcHost]
  );

  const onMint = async (beforeTransactions = [], afterTransactions = []) => {
    try {
      setIsUserMinting(true);
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        let setupMint;
        if (needTxnSplit && setupTxn === undefined) {
          toast("Please sign account setup transaction");
          setupMint = await createAccountsForMint(
            candyMachine,
            wallet.publicKey
          );
          let status = { err: true };
          if (setupMint.transaction) {
            status = await awaitTransactionSignatureConfirmation(
              setupMint.transaction,
              props.txTimeout,
              props.connection,
              true
            );
          }
          if (status && !status.err) {
            setSetupTxn(setupMint);
            toast(
              "Setup transaction succeeded! Please sign minting transaction"
            );
          } else {
            toast.error("Mint failed! Please try again!");
            setIsUserMinting(false);
            return;
          }
        } else {
          toast("Please sign minting transaction");
        }

        const mintResult = await mintOneToken(
          candyMachine,
          wallet.publicKey,
          beforeTransactions,
          afterTransactions,
          setupMint ?? setupTxn
        );

        let status = { err: true };
        let metadataStatus = null;
        if (mintResult) {
          status = await awaitTransactionSignatureConfirmation(
            mintResult.mintTxId,
            props.txTimeout,
            props.connection,
            true
          );

          metadataStatus =
            await candyMachine.program.provider.connection.getAccountInfo(
              mintResult.metadataKey,
              "processed"
            );
          console.log("Metadata status: ", !!metadataStatus);
        }

        if (status && !status.err && metadataStatus) {
          // manual update since the refresh might not detect
          // the change immediately
          const remaining = itemsRemaining - 1;
          setItemsRemaining(remaining);
          setIsActive((candyMachine.state.isActive = remaining > 0));
          candyMachine.state.isSoldOut = remaining === 0;
          setSetupTxn(undefined);
          toast.success("Congratulations! Mint succeeded!");
          refreshCandyMachineState("processed");
        } else if (status && !status.err) {
          toast.error(
            "Mint likely failed! Anti-bot SOL 0.01 fee potentially charged! Check the explorer to confirm the mint failed and if so, make sure you are eligible to mint before trying again."
          );
          refreshCandyMachineState();
        } else {
          toast.error("Mint failed! Please try again!");
          refreshCandyMachineState();
        }
      }
    } catch (error) {
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (!error.message) {
          message = "Transaction timeout! Please try again.";
        } else if (error.message.indexOf("0x137")) {
          console.log(error);
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          console.log(error);
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      toast.error(message);
      // updates the candy machine state to reflect the latest
      // information on chain
      refreshCandyMachineState();
    } finally {
      setIsUserMinting(false);
    }
  };

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);

  useEffect(() => {
    (function loop() {
      setTimeout(() => {
        refreshCandyMachineState();
        loop();
      }, 20000);
    })();
  }, [refreshCandyMachineState]);

  useEffect(() => {
    document.getElementById("hero-video").volume = 0.04;
  }, [props.videoMuted]);
  return (
    <div className="mint-container container">
      <div id="mint">
        <div className="video-container">
          <video
            id="hero-video"
            src={hero}
            preload="auto"
            autoPlay
            controls
            loop
            muted={props.videoMuted}
          />
        </div>
        <div id="claim-text-wrapper">
          <div className="claim-text-content">
            <div className="css-0">
              <h2 className="claim-heading">
                Monkai Love Potion
              </h2>
              <div role="group" className="claim-solana-button__group">
                <a
                  href={SOLANA_EXPLORER_ADDRESS}
                  rel="noreferrer"
                  target="_blank"
                  className="claim-solana-link"
                >
                  {SOLANA_ADDRESS.slice(0, 4)}....{SOLANA_ADDRESS.slice(-4)}
                  <div className="claim-arrow-container">
                    <ArrowIcon />
                  </div>
                </a>
                <button
                  type="button"
                  className={`claim-text-copy-button ${
                    copyingAddress ? "claim-copying" : ""
                  }`}
                  aria-label="Copy"
                  onClick={() => {
                    navigator.clipboard.writeText(SOLANA_ADDRESS);
                    SetCopyingAdrress(true);
                    setTimeout(() => SetCopyingAdrress(false), 1500);
                  }}
                >
                  <CopyIcon />
                  <Tick />
                </button>
              </div>
            </div>
            <div className="claim-stack">
              <div className="claim-stack-item">
                <p className="claim-stack-header">creator</p>
                <p className="claim-stack-text">3SEB...MWMD</p>
              </div>
              <div className="claim-stack__divider" />
              <div className="claim-stack-item">
                <p className="claim-stack-header">edition</p>
                <p className="claim-stack-text">MASTER</p>
              </div>
              <div className="claim-stack__divider" />
              <div className="claim-stack-item">
                <p className="claim-stack-header">supply</p>
                <p className="claim-stack-text">
                  {candyMachine ? `${itemsRemaining} / 777` : "-"}
                </p>
              </div>
            </div>
            <div id="payment-modal">
              <div id="payment-header">
                <h1>Allowlist Price </h1>
                <div className="payment-price-container">
                  <div className="payment-solana-icon">
                    <SolanaIcon />
                  </div>
                  <h2 className="payment-price-sol">{ALLOWLIST_PRICE} SOL</h2>

                  <GetPrice UNIT_PRICE={ALLOWLIST_PRICE} />
                </div>
              </div>

              <div id="payment-header">
                <h1>Public Price </h1>
                <div className="payment-price-container">
                  <div className="payment-solana-icon">
                    <SolanaIcon />
                  </div>
                  <h2 className="payment-price-sol">{PUBLIC_PRICE} SOL</h2>

                  <GetPrice UNIT_PRICE={PUBLIC_PRICE} />
                </div>
              </div>
              <button
                className="purchase-button"
                style={{ marginBottom: "8px" }}
              >
                <a href="https://magiceden.io/marketplace/Monkai" target="_blank ">
                  Buy on MagicEden
                </a>
              </button>
              {!wallet.connected ? (
                <WalletModalButton className="purchase-button">
                  <img className="purchase-button-logo sol" src={solLogo} alt="solana" />
                  <img className="purchase-button-gif sol" src={solGif} alt="solana" />
                  Connect Wallet
                </WalletModalButton>
              ) : (
                <>
                  {candyMachine?.state.isActive &&
                  candyMachine?.state.gatekeeper &&
                  wallet.publicKey &&
                  wallet.signTransaction ? (
                    <GatewayProvider
                      wallet={{
                        publicKey:
                          wallet.publicKey ||
                          new PublicKey(CANDY_MACHINE_PROGRAM),
                        //@ts-ignore
                        signTransaction: wallet.signTransaction,
                      }}
                      gatekeeperNetwork={
                        candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                      }
                      clusterUrl={rpcUrl}
                      cluster={cluster}
                      options={{ autoShowModal: false }}
                    >
                      <MintButton
                        candyMachine={candyMachine}
                        isMinting={isUserMinting}
                        setIsMinting={(val) => setIsUserMinting(val)}
                        onMint={onMint}
                        isActive={
                          isActive ||
                          (isPresale && isWhitelistUser && isValidBalance)
                        }
                      />
                    </GatewayProvider>
                  ) : (
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isUserMinting}
                      setIsMinting={(val) => setIsUserMinting(val)}
                      onMint={onMint}
                      isActive={
                        isActive ||
                        (isPresale && isWhitelistUser && isValidBalance)
                      }
                    />
                  )}
                </>
              )}
              {/* <CrossmintPayButton
                collectionTitle="Neon Future x Heavy Metal by Greg Hildenbrandt"
                collectionDescription="First NFT collection by Todd McFarlane on the new Oddkey platform. It features an animated version of his record-setting 301 cover with sound."
                collectionPhoto="https://pbs.twimg.com/media/Fai0uwAUUAA9k0x.jpg"
                clientId={process.env.REACT_APP_CROSSMINT_CLIENT_ID}
                mintConfig={{ type: "candy-machine" }}
                environment="staging"
                paymentMethod="ETH"
                style={{ width: "100%", marginTop: "0.75rem" }}
              /> */}
              
                <ETHMint />

              {/* <div>
                {candyMachine?.state.isActive &&
                candyMachine?.state.gatekeeper &&
                wallet.publicKey &&
                wallet.signTransaction ? (
                  <GatewayProvider
                    wallet={{
                      publicKey:
                        wallet.publicKey ||
                        new PublicKey(CANDY_MACHINE_PROGRAM),
                      //@ts-ignore
                      signTransaction: wallet.signTransaction,
                    }}
                    gatekeeperNetwork={
                      candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                    }
                    clusterUrl={rpcUrl}
                    cluster={cluster}
                    options={{ autoShowModal: false }}
                  >
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isUserMinting}
                      setIsMinting={(val) => setIsUserMinting(val)}
                      onMint={onMint}
                      isActive={
                        isActive ||
                        (isPresale && isWhitelistUser && isValidBalance)
                      }
                    />
                  </GatewayProvider>
                ) : (
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isUserMinting}
                    setIsMinting={(val) => setIsUserMinting(val)}
                    onMint={onMint}
                    isActive={
                      isActive ||
                      (isPresale && isWhitelistUser && isValidBalance)
                    }
                  />
                )}
              </div> */}

              {/* --- */}

              {/* {wallet ? (
                <GatewayProvider
                  wallet={{
                    publicKey:
                      wallet?.publicKey || new PublicKey(CANDY_MACHINE_PROGRAM),
                    //@ts-ignore
                    signTransaction: wallet?.signTransaction,
                  }}
                  gatekeeperNetwork={
                    new PublicKey("ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6")
                    // candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                  }
                  options={{ autoShowModal: false }}
                >
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isUserMinting}
                    setIsMinting={(val) => setIsUserMinting(val)}
                    onMint={onMint}
                    isActive={
                      isActive ||
                      (isPresale && isWhitelistUser && isValidBalance)
                    }
                  />
                </GatewayProvider>
              ) : (
                <WalletModalButton className="purchase-button">
                  Connect Wallet
                </WalletModalButton>
              )} */}
            </div>
            <div className="claim-details">
              <h2 className="claim-details-heading">Details</h2>
              <div className="claim-details-description-container">
                <div className="claim-details-description">
                  <p className="claim-details-description-heading">
                    Description
                  </p>
                  <p className="claim-details-description-text">
                    Claim for Monkai. Monkai are the first Multi-chain
                    Generative GIF NFTs on ETH & SOL & NEAR, bringing
                    new DeFi stake + farm tokenomics to the blockchains.
                    https://MonkaiNFT.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Toaster position="bottom-center" gutter={8} />
      </div>
    </div>
  );
};

export default Claim;
