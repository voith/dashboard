import { ethers } from "ethers";
import React from "react";
import { toast } from "react-toastify";
import toasty from "../assets/images/toasty.png";

export const makeShortAddress = (address: string) => {
  const shortAddress = `${address.substr(0, 6).toString()}...${address
    .substr(address.length - 4, address.length)
    .toString()}`;
  return shortAddress;
};

export const isValidAddress = async (address: string) => {
  try {
    const currentAddress = ethers.utils.getAddress(address);
    return currentAddress;
  } catch (error) {
    try {
      const tempProvider = ethers.getDefaultProvider("mainnet");
      const currentAddress = await tempProvider.resolveName(address);
      return currentAddress;
    } catch (e) {
      return null;
    }
  }
};

export const parseUint = (value: string) => {
  if (parseInt(value) < 0) {
    return "0";
  }
  return value;
};

export const toUSD = (amount: string, price: string) => parseFloat(amount) * parseFloat(price);

export const sendNotification = async (
  title: string,
  body: string,
  duration: number | false = 3000,
  fn: any = () => {},
  delay: number = 0,
  className: string = ""
) => {
  const toastConstant = (
    <div className="body">
      <img src={toasty} alt="toasty" className="toasty" />
      <h5>{title}</h5>
      <p>{body}</p>
    </div>
  );
  toast(toastConstant, {
    // @ts-ignore
    position: toast.POSITION.TOP_RIGHT,
    autoClose: duration,
    hideProgressBar: true,
    delay,
    className,
    onClose: () => {
      fn();
    },
  });
};

export const errorNotification = async (body: string) => {
  const title = "❌ Whoopsie!";
  sendNotification(title, body, 3000, () => {}, 0, "error");
};

export const notifyUser = async (tx: ethers.ContractTransaction, fn: any = () => {}) => {
  try {
    let notificationTitle = "⏰ Transaction Sent!";
    let notificationBody = "Plz wait for the transaction confirmation.";
    sendNotification(notificationTitle, notificationBody, false);
    await tx.wait(1);
    toast.dismiss();
    notificationTitle = "✔️ Transaction Confirmed!";
    notificationBody = "All set, please wait for another confirmation";
    sendNotification(notificationTitle, notificationBody, 3000, fn, 1000, "success");
    // In case the graph isn't updated on the first transaction, try to update on second transaction.
    await tx.wait(3);
    fn();
  } catch (error) {
    // catch error when vault screen changes in the middle of an update
  }
};

export const getRatio = async (
  collateral: string,
  collateralPrice: string,
  debt: string,
  tcapPrice: string
) => {
  const c = parseFloat(collateral);
  const cp = parseFloat(collateralPrice);
  const d = parseFloat(debt);
  const tp = parseFloat(tcapPrice);
  if (d === 0 || tp === 0) return 0;
  const ratio = (c * cp * 100) / (d * tp);
  return ratio;
};

export const getSafeMint = async (
  ratio: string,
  collateral: string,
  collateralPrice: string,
  tcapPrice: string,
  debt: string
) => {
  const r = parseFloat(ratio) + 50;
  const c = parseFloat(collateral);
  const cp = parseFloat(collateralPrice);
  const tp = parseFloat(tcapPrice);
  const d = parseFloat(debt);
  if (r === 0 || tp === 0) return 0;
  const maxMint = (c * cp * 100) / (r * tp);
  return maxMint - d;
};

export const getProposalStatus = (
  startBlock: number,
  endBlock: number,
  currentBlock: number,
  forVotes: number,
  againstVotes: number,
  quorumVotes: number,
  eta: number,
  gracePeriod: number
) => {
  const currentBlockTime = currentBlock * 13 * 1000;
  if (currentBlock <= startBlock) {
    return "PENDING";
  }
  if (currentBlock <= endBlock) {
    return "ACTIVE";
  }
  if (forVotes <= againstVotes || forVotes < quorumVotes) {
    return "DEFEATED";
  }
  if (eta === 0) {
    return "SUCCEEDED";
  }
  if (currentBlockTime >= eta + gracePeriod) {
    return "EXPIRED";
  }
  if (currentBlockTime >= eta) {
    return "READY";
  }
  return "QUEUED";
};
