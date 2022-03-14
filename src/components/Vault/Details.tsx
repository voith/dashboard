import React, { useState, useEffect, useContext } from "react";
import Button from "react-bootstrap/esm/Button";
import Card from "react-bootstrap/esm/Card";
import Form from "react-bootstrap/esm/Form";
import InputGroup from "react-bootstrap/esm/InputGroup";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import Tooltip from "react-bootstrap/esm/Tooltip";
import { Contract } from "ethers-multicall";
import { ethers, BigNumber } from "ethers";
import NumberFormat from "react-number-format";
import { useRouteMatch, useHistory } from "react-router-dom";
import { useQuery, gql, NetworkStatus } from "@apollo/client";
import NetworkContext from "../../state/NetworkContext";
import OraclesContext from "../../state/OraclesContext";
import TokensContext from "../../state/TokensContext";
import VaultsContext from "../../state/VaultsContext";
import SignerContext from "../../state/SignerContext";
import "../../styles/vault.scss";
import { ReactComponent as ETHIconSmall } from "../../assets/images/vault/eth.svg";
import { ReactComponent as DAIIconSmall } from "../../assets/images/vault/dai.svg";
import { ReactComponent as AAVEIconSmall } from "../../assets/images/vault/aave.svg";
import { ReactComponent as LINKIconSmall } from "../../assets/images/vault/chainlink.svg";
import { ReactComponent as UNIIconSmall } from "../../assets/images/vault/uni.svg";
import { ReactComponent as SNXIconSmall } from "../../assets/images/vault/snx2.svg";
import { ReactComponent as POLYGONIconSmall } from "../../assets/images/vault/polygon.svg";
import { ReactComponent as WBTCIconSmall } from "../../assets/images/vault/bitcoin.svg";
import { ReactComponent as ETHIcon } from "../../assets/images/graph/weth.svg";
import { ReactComponent as DAIIcon } from "../../assets/images/graph/DAI.svg";
import { ReactComponent as AAVEIcon } from "../../assets/images/graph/aave.svg";
import { ReactComponent as LINKIcon } from "../../assets/images/graph/chainlink.svg";
import { ReactComponent as SNXIcon } from "../../assets/images/graph/snx.svg";
import { ReactComponent as UNIIcon } from "../../assets/images/graph/uni.svg";
import { ReactComponent as POLYGONIcon } from "../../assets/images/graph/polygon3.svg";
import { ReactComponent as WBTCIcon } from "../../assets/images/graph/wbtc.svg";
import { ReactComponent as RatioIcon } from "../../assets/images/vault/ratio.svg";
import { ReactComponent as TcapIcon } from "../../assets/images/tcap-coin.svg";
import {
  notifyUser,
  toUSD,
  errorNotification,
  getDefaultProvider,
  isInLayer1,
  isPolygon,
  isOptimism,
  getRatio,
  getSafeRemoveCollateral,
  getSafeMint,
  isUndefined,
} from "../../utils/utils";
import Loading from "../Loading";
import { FEATURES, NETWORKS } from "../../utils/constants";

type props = {
  address: string;
  t: any;
};

// TODO: Vault doesn't show if approve is 0 even if there is data in the vault

const Details = ({ address, t }: props) => {
  const currentNetwork = useContext(NetworkContext);
  const oracles = useContext(OraclesContext);
  const tokens = useContext(TokensContext);
  const vaults = useContext(VaultsContext);
  const signer = useContext(SignerContext);

  let currency = !isPolygon(currentNetwork.chainId) ? "ETH" : "MATIC";
  const match = useRouteMatch("/vault/:currency");
  const history = useHistory();
  // @ts-ignore
  switch (match?.params?.currency?.toLowerCase()) {
    case "eth":
      currency = "ETH";
      if (FEATURES.POLYGON && isPolygon(currentNetwork.chainId)) {
        history?.push(`/vault/MATIC`);
        currency = "MATIC";
      }
      break;
    case "weth":
      currency = "WETH";
      if (FEATURES.POLYGON && isPolygon(currentNetwork.chainId)) {
        history?.push(`/vault/MATIC`);
        currency = "MATIC";
      }
      break;
    case "wbtc":
      currency = "WBTC";
      if (isOptimism(currentNetwork.chainId)) {
        history?.push(`/vault/ETH`);
        currency = "ETH";
      }
      break;
    case "dai":
      currency = "DAI";
      break;
    case "aave":
      if (isInLayer1(currentNetwork.chainId)) {
        currency = "AAVE";
      } else {
        currency = "ETH";
        history?.push(`/vault/ETH`);
      }
      break;
    case "link":
      if (!isPolygon(currentNetwork.chainId)) {
        currency = "LINK";
      } else {
        currency = "ETH";
        history?.push(`/vault/ETH`);
      }
      break;
    case "matic":
      currency = "MATIC";
      if (!FEATURES.POLYGON && !isPolygon(currentNetwork.chainId)) {
        history?.push(`/vault/ETH`);
        currency = "ETH";
      }
      break;
    default:
      currency = FEATURES.POLYGON && isPolygon(currentNetwork.chainId) ? "MATIC" : "ETH";
      break;
  }

  // Actions
  const [title, setTitle] = useState(t("vault.create"));
  const [text, setText] = useState(t("vault.create-text"));
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [btnDisabled, setBtnDisabled] = useState(false);

  // Vault Data
  const [vaultOptions, setVaultOptions] = useState<Array<string>>([]);
  const [selectedVaultId, setSelectedVaultId] = useState("0");
  const [vaultDebt, setVaultDebt] = useState("0");
  const [vaultDebtUSD, setVaultDebtUSD] = useState("0");
  const [vaultCollateral, setVaultCollateral] = useState("0");
  const [vaultCollateralUSD, setVaultCollateralUSD] = useState("0");
  const [vaultRatio, setVaultRatio] = useState("0");
  const [tempRatio, setTempRatio] = useState("");
  const [minRatio, setMinRatio] = useState("0");
  const [selectedVault, setSelectedVault] = useState(currency);
  const [selectedVaultContract, setSelectedVaultContract] = useState<ethers.Contract>();
  const [selectedVaultRead, setSelectedVaultRead] = useState<Contract>();
  const [selectedOracleRead, setSelectedOracleRead] = useState<Contract>();
  const [selectedCollateralContract, setSelectedCollateralContract] = useState<ethers.Contract>();
  const [selectedVaultDecimals, setSelectedVaultDecimals] = useState(18);

  // General Data
  const [tokenBalanceUSD, setTokenBalanceUSD] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [tokenBalanceDecimals, setTokenBalanceDecimals] = useState(2);

  // Inputs
  const [addCollateralTxt, setAddCollateralTxt] = useState("");
  const [addCollateralUSD, setAddCollateralUSD] = useState("0");
  const [removeCollateralTxt, setRemoveCollateralTxt] = useState("");
  const [removeCollateralUSD, setRemoveCollateralUSD] = useState("0");
  const [mintTxt, setMintTxt] = useState("");
  const [mintUSD, setMintUSD] = useState("0");
  const [burnTxt, setBurnTxt] = useState("");
  const [burnUSD, setBurnUSD] = useState("0");
  const [burnFee, setBurnFee] = useState("0");
  const [vaultStatus, setVaultStatus] = useState("");

  // Infinite Approval
  const approveValue = BigNumber.from("1157920892373161954235709850086879078532699");

  const USER_VAULT = gql`
    query getVault($owner: String!) {
      vaults(where: { owner: $owner }) {
        id
        vaultId
        owner
        collateral
        debt
        address
        owner
      }
      _meta {
        block {
          number
          hash
        }
        hasIndexingErrors
      }
    }
  `;

  const tcapPrice = async () => {
    const currentTCAPPriceCall = await oracles.tcapOracleRead?.getLatestAnswer();

    // @ts-ignore
    const [currentTCAPPrice] = await signer.ethcallProvider?.all([currentTCAPPriceCall]);
    return currentTCAPPrice;
  };

  const collateralPrice = async () => {
    const collateralPriceCall = await selectedOracleRead?.getLatestAnswer();

    // @ts-ignore
    const [currentCollateralPrice] = await signer.ethcallProvider?.all([collateralPriceCall]);
    return currentCollateralPrice;
  };

  const validVaults = (): boolean => {
    let valid =
      !isUndefined(oracles.daiOracle) &&
      !isUndefined(oracles.tcapOracle) &&
      !isUndefined(oracles.daiOracleRead) &&
      !isUndefined(vaults.daiVault) &&
      !isUndefined(tokens.daiTokenRead);

    if (isInLayer1(currentNetwork.chainId)) {
      valid =
        valid &&
        !isUndefined(oracles.wethOracle) &&
        !isUndefined(oracles.aaveOracle) &&
        !isUndefined(oracles.linkOracle) &&
        !isUndefined(oracles.wethOracleRead) &&
        !isUndefined(oracles.aaveOracleRead) &&
        !isUndefined(oracles.linkOracleRead) &&
        !isUndefined(vaults.wethVault) &&
        !isUndefined(vaults.aaveVault) &&
        !isUndefined(vaults.linkVault) &&
        !isUndefined(tokens.aaveToken) &&
        !isUndefined(tokens.linkToken) &&
        !isUndefined(tokens.wethTokenRead) &&
        !isUndefined(tokens.aaveTokenRead) &&
        !isUndefined(tokens.linkTokenRead);
    }
    if (isOptimism(currentNetwork.chainId)) {
      valid =
        valid &&
        !isUndefined(oracles.linkOracle) &&
        !isUndefined(oracles.snxOracle) &&
        !isUndefined(oracles.uniOracle) &&
        !isUndefined(oracles.linkOracleRead) &&
        !isUndefined(oracles.snxOracleRead) &&
        !isUndefined(oracles.uniOracleRead) &&
        !isUndefined(vaults.linkVault) &&
        !isUndefined(vaults.snxVault) &&
        !isUndefined(vaults.uniVault) &&
        !isUndefined(tokens.linkToken) &&
        !isUndefined(tokens.snxToken) &&
        !isUndefined(tokens.uniToken) &&
        !isUndefined(tokens.linkTokenRead) &&
        !isUndefined(tokens.snxTokenRead) &&
        !isUndefined(tokens.uniTokenRead);
    }
    if (isPolygon(currentNetwork.chainId)) {
      valid =
        valid &&
        !isUndefined(oracles.maticOracle) &&
        !isUndefined(oracles.maticOracleRead) &&
        !isUndefined(oracles.wbtcOracle) &&
        !isUndefined(oracles.wbtcOracleRead) &&
        !isUndefined(vaults.maticVault) &&
        !isUndefined(vaults.maticVaultRead) &&
        !isUndefined(vaults.wbtcVault) &&
        !isUndefined(vaults.wbtcVaultRead) &&
        !isUndefined(tokens.maticToken) &&
        !isUndefined(tokens.maticTokenRead) &&
        !isUndefined(tokens.wbtcToken) &&
        !isUndefined(tokens.maticTokenRead);
    }

    return valid;
  };

  const isGasAsset = () =>
    (!isPolygon(currentNetwork.chainId) && selectedVault === "ETH") ||
    (isPolygon(currentNetwork.chainId) && selectedVault === "MATIC");

  async function loadVault(vaultType: string, vaultData: any) {
    if (signer.signer && validVaults() && vaultData) {
      let currentVault: any;
      let currentVaultRead: any;
      let currentToken;
      let currentOracleRead;
      let currentTokenRead;
      let balance;
      const provider = getDefaultProvider(
        currentNetwork.chainId || NETWORKS.mainnet.chainId,
        currentNetwork.chainId === 1 ? NETWORKS.mainnet.name : NETWORKS.rinkeby.name
      );
      switch (vaultType) {
        case "ETH":
          currentVault = vaults.wethVault;
          currentVaultRead = vaults.wethVaultRead;
          currentToken = tokens.wethToken;
          currentOracleRead = oracles.wethOracleRead;
          currentTokenRead = tokens.wethTokenRead;
          balance = await provider.getBalance(address);
          break;
        case "WETH":
          currentVault = vaults.wethVault;
          currentVaultRead = vaults.wethVaultRead;
          currentToken = tokens.wethToken;
          currentOracleRead = oracles.wethOracleRead;
          currentTokenRead = tokens.wethTokenRead;
          break;
        case "DAI":
          currentVault = vaults.daiVault;
          currentVaultRead = vaults.daiVaultRead;
          currentToken = tokens.daiToken;
          currentOracleRead = oracles.daiOracleRead;
          currentTokenRead = tokens.daiTokenRead;
          break;
        case "AAVE":
          currentVault = vaults.aaveVault;
          currentVaultRead = vaults.aaveVaultRead;
          currentToken = tokens.aaveToken;
          currentOracleRead = oracles.aaveOracleRead;
          currentTokenRead = tokens.aaveTokenRead;
          break;
        case "LINK":
          currentVault = vaults.linkVault;
          currentVaultRead = vaults.linkVaultRead;
          currentToken = tokens.linkToken;
          currentOracleRead = oracles.linkOracleRead;
          currentTokenRead = tokens.linkTokenRead;
          break;
        case "SNX":
          currentVault = vaults.snxVault;
          currentVaultRead = vaults.snxVaultRead;
          currentToken = tokens.snxToken;
          currentOracleRead = oracles.snxOracleRead;
          currentTokenRead = tokens.snxTokenRead;
          break;
        case "UNI":
          currentVault = vaults.uniVault;
          currentVaultRead = vaults.uniVaultRead;
          currentToken = tokens.uniToken;
          currentOracleRead = oracles.uniOracleRead;
          currentTokenRead = tokens.uniTokenRead;
          break;
        case "MATIC":
          currentVault = vaults.maticVault;
          currentVaultRead = vaults.maticVaultRead;
          currentToken = tokens.maticToken;
          currentOracleRead = oracles.maticOracleRead;
          currentTokenRead = tokens.maticTokenRead;
          // balance = await provider.getBalance(address);
          break;
        case "WBTC":
          currentVault = vaults.wbtcVault;
          currentVaultRead = vaults.wbtcVaultRead;
          currentToken = tokens.wbtcToken;
          currentOracleRead = oracles.wbtcOracleRead;
          currentTokenRead = tokens.wbtcTokenRead;
          // balance = await provider.getBalance(address);
          break;
        default:
          currentVault = vaults.wethVault;
          currentVaultRead = vaults.wethVaultRead;
          currentToken = tokens.wethToken;
          currentOracleRead = oracles.wethOracleRead;
          currentTokenRead = tokens.wethTokenRead;
          break;
      }
      setSelectedVaultContract(currentVault);
      setSelectedCollateralContract(currentToken);
      setSelectedVaultRead(currentVaultRead);
      setSelectedOracleRead(currentOracleRead);

      let currentVaultData: any;
      // Removed GRAPH
      // if data is empty load vault data from contract
      const graphBlock = vaultData._meta.block.number;
      let currentBlock = await provider.getBlockNumber();
      currentBlock -= 10;
      if (
        (currentNetwork.chainId === NETWORKS.mainnet.chainId ||
          currentNetwork.chainId === NETWORKS.rinkeby.chainId) &&
        vaultData.vaults.length > 0 &&
        !vaultData._meta.hasIndexingErrors &&
        graphBlock >= currentBlock
      ) {
        await vaultData.vaults.forEach((v: any) => {
          if (v.address.toLowerCase() === currentVault.address.toLowerCase()) {
            currentVaultData = v;
          }
        });
      } else {
        const vaultID = await currentVault.userToVault(address);
        if (!vaultID.eq(0)) {
          const vault = await currentVault.vaults(vaultID);
          currentVaultData = {
            vaultId: vaultID,
            collateral: vault.Collateral,
            debt: vault.Debt,
          };
        }
      }

      if (vaultType !== "ETH") {
        // @ts-ignore
        balance = await currentToken.balanceOf(address);
      }

      let decimals = 18;
      let currentPrice;

      if (currentVaultData) {
        const { vaultId, collateral, debt } = currentVaultData;
        // @ts-ignore
        const allowanceCall = await currentTokenRead.allowance(address, currentVault.address);
        const currentRatioCall = await currentVaultRead.getVaultRatio(vaultId);

        // @ts-ignore
        const currentTCAPPriceCall = await oracles.tcapOracleRead?.getLatestAnswer();
        // @ts-ignore
        const decimalsCall = await currentTokenRead.decimals();
        // @ts-ignore
        const currentPriceCall = await currentOracleRead.getLatestAnswer();
        const currentMinRatioCall = await currentVaultRead.ratio();

        // @ts-ignore
        const [
          allowance,
          currentRatio,
          currentTCAPPrice,
          decimalsVal,
          currentPriceVal,
          currentMinRatio,
        ] = await signer.ethcallProvider?.all([
          allowanceCall,
          currentRatioCall,
          currentTCAPPriceCall,
          decimalsCall,
          currentPriceCall,
          currentMinRatioCall,
        ]);

        decimals = decimalsVal;
        currentPrice = ethers.utils.formatEther(currentPriceVal.mul(10000000000));
        setSelectedVaultId(vaultId);

        if (!allowance.isZero() || vaultType === "ETH") {
          setMinRatio(currentMinRatio.toString());
          setIsApproved(true);
          setVaultRatio(currentRatio.toString());
          if (currentRatio.toString() === "0") {
            setVaultStatus("N/A");
          } else if (currentRatio.toString() >= parseFloat(currentMinRatio.toString()) + 50) {
            setVaultStatus("safe");
          } else if (currentRatio.toString() >= parseFloat(currentMinRatio.toString()) + 30) {
            setVaultStatus("warning");
          } else {
            setVaultStatus("danger");
          }

          const parsedCollateral = ethers.utils.formatUnits(collateral, decimals);

          // const parsedCollateral = ethers.utils.formatEther(collateral);
          setVaultCollateral(parsedCollateral);
          const usdCollateral = toUSD(currentPrice, parsedCollateral);
          setVaultCollateralUSD(usdCollateral.toString());

          const currentTCAPPriceFormat = ethers.utils.formatEther(currentTCAPPrice);
          const parsedDebt = ethers.utils.formatEther(debt);
          setVaultDebt(parsedDebt);
          const usdTCAP = toUSD(currentTCAPPriceFormat, parsedDebt);
          setVaultDebtUSD(usdTCAP.toString());
        } else {
          setText(t("vault.approve-text"));
          setTitle(t("vault.approve"));
          setIsApproved(false);
        }
      } else {
        // @ts-ignore
        const decimalsCall = await currentTokenRead.decimals();
        // @ts-ignore
        const currentPriceCall = await currentOracleRead.getLatestAnswer();
        // @ts-ignore
        const [decimalsVal, currentPriceVal] = await signer.ethcallProvider?.all([
          decimalsCall,
          currentPriceCall,
        ]);
        decimals = decimalsVal;
        currentPrice = ethers.utils.formatEther(currentPriceVal.mul(10000000000));

        setSelectedVaultId("0");
        setText(t("vault.create-text"));
        setTitle(t("vault.create"));
        setIsApproved(false);
      }

      setSelectedVaultDecimals(decimals);
      const currentBalance = ethers.utils.formatUnits(balance, decimals);
      if (parseFloat(currentBalance) < 0.09) {
        setTokenBalanceDecimals(4);
      } else {
        setTokenBalanceDecimals(2);
      }
      setTokenBalance(currentBalance);

      const usdBalance = toUSD(currentPrice, currentBalance);
      setTokenBalanceUSD(usdBalance.toString());
    }
  }

  const { data, error, refetch, networkStatus } = useQuery(USER_VAULT, {
    variables: { owner: address },
    pollInterval: 200000,
    fetchPolicy: "no-cache",
    notifyOnNetworkStatusChange: true,
    onError: () => {
      console.log(error);
    },
    onCompleted: () => {
      let vaultType = selectedVault;
      if (isPolygon(currentNetwork.chainId) && vaultType === "ETH") {
        vaultType = "MATIC";
        setSelectedVault("MATIC");
      }
      loadVault(vaultType, data);
    },
  });

  const refresh = async () => {
    try {
      if (!isOptimism(currentNetwork.chainId)) {
        await refetch();
      } else {
        loadVault(selectedVault, data);
      }
    } catch (error) {
      console.log(error);
      // catch error in case the vault screen is changed
    }
  };

  const resetFields = () => {
    setBurnFee("0");
    setAddCollateralUSD("0");
    setAddCollateralTxt("");
    setRemoveCollateralTxt("");
    setRemoveCollateralUSD("0");
    setMintTxt("");
    setMintUSD("0");
    setBurnUSD("0");
    setBurnTxt("");
  };

  const changeVault = async (newRatio: number, reset = false) => {
    let r = newRatio;
    if (reset) {
      r = parseFloat(tempRatio);
      setVaultRatio(tempRatio);
      setTempRatio("");
      resetFields();
    } else {
      if (tempRatio === "") {
        setTempRatio(vaultRatio);
      }
      r = newRatio;
      setVaultRatio(r.toString());
    }

    if (r === 0) {
      setVaultStatus(t("vault.status.na"));
    } else if (r >= parseFloat(minRatio) + 50) {
      setVaultStatus(t("vault.status.safe"));
    } else if (r >= parseFloat(minRatio) + 30) {
      setVaultStatus(t("vault.status.warning"));
    } else if (r >= parseFloat(minRatio)) {
      setVaultStatus(t("vault.status.danger"));
    } else {
      setVaultRatio("0");
      setVaultStatus(t("vault.status.error"));
    }
  };

  // forms
  const onChangeAddCollateral = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddCollateralTxt(event.target.value);
    if (event.target.value !== "") {
      const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
      const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
      let usd = toUSD(currentPrice, event.target.value);
      if (!usd) {
        usd = 0;
      }
      const newCollateral = parseFloat(event.target.value) + parseFloat(vaultCollateral);
      const r = await getRatio(newCollateral.toString(), currentPrice, vaultDebt, currentTcapPrice);
      changeVault(r);
      setAddCollateralUSD(usd.toString());
    } else {
      changeVault(0, true);
      setAddCollateralUSD("0");
    }
  };

  const onChangeRemoveCollateral = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setRemoveCollateralTxt(event.target.value);
    if (event.target.value !== "") {
      const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
      const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
      let usd = toUSD(currentPrice, event.target.value);
      if (!usd) {
        usd = 0;
      }
      const newCollateral = parseFloat(vaultCollateral) - parseFloat(event.target.value);
      const r = await getRatio(newCollateral.toString(), currentPrice, vaultDebt, currentTcapPrice);
      changeVault(r);
      setRemoveCollateralUSD(usd.toString());
    } else {
      changeVault(0, true);
      setRemoveCollateralUSD("0");
    }
  };

  const onChangeMint = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setMintTxt(event.target.value);
    if (event.target.value !== "") {
      const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
      const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
      let usd = toUSD(currentTcapPrice, event.target.value);
      if (!usd) {
        usd = 0;
      }
      const newDebt = parseFloat(event.target.value) + parseFloat(vaultDebt);
      const r = await getRatio(vaultCollateral, currentPrice, newDebt.toString(), currentTcapPrice);
      changeVault(r);
      setMintUSD(usd.toString());
    } else {
      changeVault(0, true);
      setMintUSD("0");
    }
  };

  const onChangeBurn = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setBurnTxt(event.target.value);
      if (event.target.value !== "") {
        const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
        const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
        let usd = toUSD(currentTcapPrice, event.target.value);
        if (!usd) {
          usd = 0;
        }
        const newDebt = parseFloat(vaultDebt) - parseFloat(event.target.value);
        const r = await getRatio(
          vaultCollateral,
          currentPrice,
          newDebt.toString(),
          currentTcapPrice
        );
        changeVault(r);
        setBurnUSD(usd.toString());
        const currentBurnFee = await selectedVaultContract?.getFee(
          ethers.utils.parseEther(event.target.value)
        );
        const increasedFee = currentBurnFee.add(currentBurnFee.div(100)).toString();
        const ethFee = ethers.utils.formatEther(increasedFee);
        setBurnFee(ethFee.toString());
      } else {
        changeVault(0, true);
        setBurnUSD("0");
        setBurnFee("0");
      }
    } catch (error) {
      console.error(error);
      changeVault(0, true);
      setBurnUSD("0");
      setBurnFee("0");
    }
  };

  const addCollateral = async () => {
    if (addCollateralTxt) {
      setBtnDisabled(true);
      // fix decimals
      const amount = ethers.utils.parseUnits(addCollateralTxt, selectedVaultDecimals);
      try {
        if (isGasAsset()) {
          let tx;
          if (selectedVault === "ETH") {
            tx = await selectedVaultContract?.addCollateralETH({
              value: amount,
            });
          } else {
            tx = await selectedVaultContract?.addCollateralMATIC({
              value: amount,
            });
          }
          notifyUser(tx, refresh);
        } else {
          const tx = await selectedVaultContract?.addCollateral(amount);
          notifyUser(tx, refresh);
        }
      } catch (error) {
        console.error(error);
        if (error.code === 4001) {
          errorNotification(t("errors.tran-rejected"));
        } else {
          errorNotification(t("errors.no-funds"));
        }
      }
      setBtnDisabled(false);
      setAddCollateralTxt("");
      setAddCollateralUSD("0");
    } else {
      errorNotification(t("errors.empty"));
    }
  };

  const maxAddCollateral = async (e: React.MouseEvent) => {
    e.preventDefault();
    let balance = "0";
    if (selectedVault === "ETH") {
      const provider = getDefaultProvider(currentNetwork.chainId, currentNetwork.name);
      balance = ethers.utils.formatEther(await provider.getBalance(address));
    } else if (selectedCollateralContract) {
      const value = BigNumber.from(await selectedCollateralContract.balanceOf(address));
      balance = ethers.utils.formatUnits(value, selectedVaultDecimals);
    }
    const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
    const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
    setAddCollateralTxt(balance);
    let usd = toUSD(currentPrice, balance);
    if (!usd) {
      usd = 0;
    }
    const newCollateral = parseFloat(balance) + parseFloat(vaultCollateral);
    const r = await getRatio(newCollateral.toString(), currentPrice, vaultDebt, currentTcapPrice);
    changeVault(r);
    setAddCollateralUSD(usd.toString());
  };

  const removeCollateral = async () => {
    if (removeCollateralTxt) {
      const amount = ethers.utils.parseUnits(removeCollateralTxt, selectedVaultDecimals);
      setBtnDisabled(true);
      try {
        if (isGasAsset()) {
          let tx;
          if (selectedVault === "ETH") {
            tx = await selectedVaultContract?.removeCollateralETH(amount);
          } else {
            tx = await selectedVaultContract?.removeCollateralMATIC(amount);
          }
          notifyUser(tx, refresh);
        } else {
          const tx = await selectedVaultContract?.removeCollateral(amount);
          notifyUser(tx, refresh);
        }
      } catch (error) {
        console.error(error);
        if (error.code === 4001) {
          errorNotification(t("errors.tran-rejected"));
        } else {
          errorNotification(t("vault.errors.tran-rejected"));
        }
      }
      setBtnDisabled(false);
      setRemoveCollateralTxt("");
      setRemoveCollateralUSD("0");
    } else {
      errorNotification(t("errors.empty"));
    }
  };

  const safeRemoveCollateral = async (e: React.MouseEvent) => {
    e.preventDefault();
    const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
    const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
    let collateralToRemove = await getSafeRemoveCollateral(
      minRatio,
      vaultCollateral,
      currentPrice,
      currentTcapPrice,
      vaultDebt
    );
    if (selectedVaultDecimals === 8) {
      collateralToRemove = parseFloat(collateralToRemove.toFixed(8)) - 0.00000001;
      collateralToRemove = parseFloat(collateralToRemove.toFixed(8));
    }
    setRemoveCollateralTxt(collateralToRemove.toString());
    let usd = toUSD(currentPrice, collateralToRemove.toString());
    if (!usd) {
      usd = 0;
    }
    const newCollateral = parseFloat(vaultCollateral) - collateralToRemove;
    const r = await getRatio(newCollateral.toString(), currentPrice, vaultDebt, currentTcapPrice);
    changeVault(r);
    setRemoveCollateralUSD(usd.toString());
  };

  const mintTCAP = async () => {
    if (mintTxt) {
      setBtnDisabled(true);
      try {
        const amount = ethers.utils.parseEther(mintTxt);
        const tx = await selectedVaultContract?.mint(amount);
        notifyUser(tx, refresh);
      } catch (error) {
        console.error(error);
        if (error.code === 4001) {
          errorNotification(t("errors.tran-rejected"));
        } else {
          errorNotification(t("vault.errors.no-collateral"));
        }
      }
      setBtnDisabled(false);
      setMintTxt("");
      setMintUSD("0");
    } else {
      errorNotification(t("errors.empty"));
    }
  };

  const safeMintTCAP = async (e: React.MouseEvent) => {
    e.preventDefault();
    const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
    const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
    const safeMint = await getSafeMint(
      minRatio,
      vaultCollateral,
      currentPrice,
      currentTcapPrice,
      vaultDebt
    );
    setMintTxt(safeMint.toString());
    let usd = toUSD(currentTcapPrice, safeMint.toString());
    if (!usd) {
      usd = 0;
    }
    const newDebt = safeMint + parseFloat(vaultDebt);
    const r = await getRatio(vaultCollateral, currentPrice, newDebt.toString(), currentTcapPrice);
    changeVault(r);
    setMintUSD(usd.toString());
  };

  const burnTCAP = async () => {
    if (burnTxt) {
      const amount = ethers.utils.parseEther(burnTxt);
      // const currentBalanceCall = await tokens.tcapTokenRead?.balanceOf(address);
      // @ts-ignore
      // const [currentBalance] = await signer.ethcallProvider?.all([currentBalanceCall]);
      // if (amount.lt(currentBalance)) {
      setBtnDisabled(true);
      try {
        const currentBurnFee = await selectedVaultContract?.getFee(amount);
        const increasedFee = currentBurnFee.add(currentBurnFee.div(100)).toString();
        const ethFee = ethers.utils.formatEther(increasedFee);
        setBurnFee(ethFee.toString());
        const tx = await selectedVaultContract?.burn(amount, { value: increasedFee });
        notifyUser(tx, refresh);
      } catch (error) {
        console.error(error);
        if (error.code === 4001) {
          errorNotification(t("errors.tran-rejected"));
        } else {
          errorNotification(t("vault.errors.burn-too-high"));
        }
      }
      setBtnDisabled(false);
      setBurnTxt("");
      setBurnUSD("0");
      setBurnFee("0");
      /* } else {
        errorNotification(t("vault.errors.burn-balance-low"));
      } */
    } else {
      errorNotification(t("errors.empty"));
    }
  };

  const maxBurnTCAP = async (e: React.MouseEvent) => {
    e.preventDefault();
    const currentPrice = ethers.utils.formatEther((await collateralPrice()).mul(10000000000));
    const currentTcapPrice = ethers.utils.formatEther(await tcapPrice());
    const currentBalanceCall = await tokens.tcapTokenRead?.balanceOf(address);
    const currentVaultDebtCall = await selectedVaultRead?.vaults(selectedVaultId);

    // @ts-ignore
    const [currentBalance, currentVault] = await signer.ethcallProvider?.all([
      currentBalanceCall,
      currentVaultDebtCall,
    ]);

    let balanceFormat = "0";
    let balance;
    if (currentBalance.lt(currentVault.Debt)) {
      balanceFormat = ethers.utils.formatEther(currentBalance);
      balance = currentBalance;
    } else {
      balanceFormat = vaultDebt;
      balance = currentVault.Debt;
    }
    setBurnTxt(balanceFormat);
    let usd = toUSD(currentTcapPrice, balanceFormat);
    if (!usd) {
      usd = 0;
    }
    const newDebt = parseFloat(balanceFormat) - parseFloat(balanceFormat);
    const r = await getRatio(vaultCollateral, currentPrice, newDebt.toString(), currentTcapPrice);
    changeVault(r);
    setBurnUSD(usd.toString());

    if (balanceFormat !== "0") {
      const currentBurnFee = await selectedVaultContract?.getFee(balance);
      const increasedFee = currentBurnFee.add(currentBurnFee.div(100)).toString();
      const ethFee = ethers.utils.formatEther(increasedFee);
      setBurnFee(ethFee.toString());
    } else {
      setBurnFee("0");
    }
  };

  const action = async () => {
    if (selectedVaultId === "0") {
      setBtnDisabled(true);
      try {
        const tx = await selectedVaultContract?.createVault();
        notifyUser(tx, refresh);
      } catch (error) {
        if (error.code === 4001 || error.code === -32603) {
          errorNotification(t("errors.tran-rejected"));
        }
      }
      setBtnDisabled(false);
    } else {
      setBtnDisabled(true);
      try {
        const amount = approveValue;
        const tx = await selectedCollateralContract?.approve(
          selectedVaultContract?.address,
          amount
        );
        notifyUser(tx, refresh);
      } catch (error) {
        if (error.code === 4001 || error.code === -32603) {
          errorNotification(t("errors.tran-rejected"));
        }
      }
      setBtnDisabled(false);
    }
  };

  const onChangeVault = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsApproved(false);
    setTokenBalance("0");
    setTokenBalanceUSD("0");
    setSelectedVault(event.target.value);
    // Clean form
    setAddCollateralTxt("");
    setAddCollateralUSD("0");
    setRemoveCollateralTxt("");
    setRemoveCollateralUSD("0");
    setMintTxt("");
    setMintUSD("0");
    setBurnTxt("");
    setBurnUSD("0");
    setBurnFee("0");
    // Load values
    history?.push(`/vault/${event.target.value}`);
    await refetch();
  };

  useEffect(() => {
    async function load() {
      let vOptions = ["ETH", "WETH", "DAI", "AAVE", "LINK", "WBTC"];
      if (isOptimism(currentNetwork.chainId)) {
        vOptions = ["ETH", "DAI", "LINK", "UNI", "SNX"];
      }
      if (isPolygon(currentNetwork.chainId)) {
        vOptions = ["MATIC", "DAI", "WBTC"];
      }
      setVaultOptions(vOptions);
      // TODO : if stuck at pending do something
      if (networkStatus === NetworkStatus.ready || networkStatus === NetworkStatus.error) {
        setIsLoading(false);
      }
    }
    load();
    // eslint-disable-next-line
  }, [address, data]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loading title={t("loading")} message={t("wait")} />
      </div>
    );
  }

  return (
    <>
      <p>{t("vault.subtitle1")}</p>
      <div className="icon-container">
        {(() => {
          switch (selectedVault) {
            case "DAI":
              return <DAIIconSmall className="dai" />;
            case "AAVE":
              return <AAVEIconSmall className="btc" />;
            case "LINK":
              return <LINKIconSmall className="link" />;
            case "UNI":
              return <UNIIconSmall className="uni" />;
            case "SNX":
              return <SNXIconSmall className="link" />;
            case "MATIC":
              return <POLYGONIconSmall className="dai" />;
            case "WBTC":
              return <WBTCIconSmall className="btc small" />;
            default:
              return <ETHIconSmall className="weth" />;
          }
        })()}

        <div className="select-container">
          <Form.Control as="select" onChange={onChangeVault} value={selectedVault}>
            {vaultOptions.map((val) => (
              <option key={val}>{val}</option>
            ))}
          </Form.Control>
          <p className="number">
            <NumberFormat
              className="number"
              value={tokenBalance}
              displayType="text"
              thousandSeparator
              decimalScale={2}
            />{" "}
            {selectedVault} /{" "}
            <NumberFormat
              className="number"
              value={tokenBalanceUSD}
              displayType="text"
              thousandSeparator
              prefix="$"
              decimalScale={2}
            />
          </p>
        </div>
      </div>
      {isApproved ? (
        <>
          <div className="actions-container">
            <div className="balance">
              <Card>
                {(() => {
                  switch (selectedVault) {
                    case "DAI":
                      return <DAIIcon className="eth" />;
                    case "AAVE":
                      return <AAVEIcon className="eth" />;
                    case "LINK":
                      return <LINKIcon className="eth" />;
                    case "UNI":
                      return <UNIIcon className="eth" />;
                    case "SNX":
                      return <SNXIcon className="eth" />;
                    case "MATIC":
                      return <POLYGONIcon className="eth" />;
                    case "WBTC":
                      return <WBTCIcon className="eth" />;
                    default:
                      return <ETHIcon className="eth" />;
                  }
                })()}
                <div className="info">
                  <h4>{t("vault.balance-title", { vault: selectedVault })}</h4>
                  <div>
                    <div className="amount">
                      {(() => {
                        switch (selectedVault) {
                          case "DAI":
                            return <DAIIconSmall className="dai small" />;
                          case "AAVE":
                            return <AAVEIconSmall className="aave small" />;
                          case "LINK":
                            return <LINKIconSmall className="link small" />;
                          case "UNI":
                            return <UNIIconSmall className="uni small" />;
                          case "SNX":
                            return <SNXIconSmall className="snx small" />;
                          case "MATIC":
                            return <POLYGONIconSmall className="btc small" />;
                          case "WBTC":
                            return <WBTCIconSmall className="btc small" />;
                          default:
                            return <ETHIconSmall className="small" />;
                        }
                      })()}
                      <h4 className=" ml-2 number neon-highlight">
                        <NumberFormat
                          className="number"
                          value={tokenBalance}
                          displayType="text"
                          thousandSeparator
                          decimalScale={tokenBalanceDecimals}
                        />
                      </h4>
                    </div>
                    <p className="number">
                      <NumberFormat
                        className="number"
                        value={tokenBalanceUSD}
                        displayType="text"
                        thousandSeparator
                        prefix="$"
                        decimalScale={parseFloat(tokenBalanceUSD) > 1000 ? 0 : 2}
                      />
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <RatioIcon className="ratio" />
                <div className="info">
                  <h4>{t("vault.ratio-title")}</h4>{" "}
                  <OverlayTrigger
                    key="top"
                    placement="top"
                    overlay={
                      <Tooltip id="tooltip-top">{t("vault.ratio-warning", { minRatio })}</Tooltip>
                    }
                  >
                    <Button variant="dark">?</Button>
                  </OverlayTrigger>
                  <div>
                    <div className="amount">
                      <h4 className=" ml-2 number neon-blue">
                        <NumberFormat
                          className="number"
                          value={vaultRatio}
                          displayType="text"
                          thousandSeparator
                          decimalScale={0}
                          suffix="%"
                        />
                      </h4>
                    </div>
                    <p className={`number ${vaultStatus}`}>{vaultStatus.toUpperCase()}</p>
                  </div>
                </div>
              </Card>
            </div>
            <div className="form-card">
              <Card>
                <div className="info">
                  <h4>{t("vault.collateral.title")}</h4>
                  <div>
                    <div className="amount">
                      {(() => {
                        switch (selectedVault) {
                          case "DAI":
                            return <DAIIconSmall className="dai" />;
                          case "AAVE":
                            return <AAVEIconSmall className="aave" />;
                          case "LINK":
                            return <LINKIconSmall className="link" />;
                          case "SNX":
                            return <SNXIconSmall className="snx" />;
                          case "UNI":
                            return <UNIIconSmall className="uni" />;
                          case "MATIC":
                            return <POLYGONIconSmall className="polygon" />;
                          case "WBTC":
                            return <WBTCIconSmall className="btc small" />;
                          default:
                            return <ETHIconSmall className="weth" />;
                        }
                      })()}
                      <h4 className=" ml-2 number neon-dark-blue">
                        <NumberFormat
                          className="number"
                          value={vaultCollateral}
                          displayType="text"
                          thousandSeparator
                          decimalScale={2}
                        />
                      </h4>
                    </div>
                    <p className="number">
                      <NumberFormat
                        className="number"
                        value={vaultCollateralUSD}
                        displayType="text"
                        thousandSeparator
                        prefix="$"
                        decimalScale={parseFloat(vaultCollateralUSD) > 1000 ? 0 : 2}
                      />
                    </p>
                  </div>
                </div>
                <Form>
                  <Form.Group>
                    <Form.Label>{t("vault.collateral.add")}</Form.Label>
                    <Form.Label className="max">
                      <a href="/" className="number" onClick={maxAddCollateral}>
                        {t("max")}
                      </a>
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        placeholder=""
                        className="neon-green"
                        value={addCollateralTxt}
                        onChange={onChangeAddCollateral}
                      />
                      <InputGroup.Append>
                        <Button
                          className="neon-green"
                          onClick={addCollateral}
                          disabled={btnDisabled}
                        >
                          +
                        </Button>
                      </InputGroup.Append>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      <NumberFormat
                        className="number"
                        value={addCollateralUSD}
                        displayType="text"
                        thousandSeparator
                        prefix="$"
                        decimalScale={2}
                      />
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className="remove">
                    <Form.Label>{t("vault.collateral.remove")}</Form.Label>
                    <Form.Label className="max">
                      <a href="/" className="number orange" onClick={safeRemoveCollateral}>
                        {t("max-safe")}
                      </a>
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        placeholder=""
                        className="neon-orange"
                        value={removeCollateralTxt}
                        onChange={onChangeRemoveCollateral}
                      />
                      <InputGroup.Append>
                        <Button
                          className="neon-orange"
                          onClick={removeCollateral}
                          disabled={btnDisabled}
                        >
                          -
                        </Button>
                      </InputGroup.Append>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      <NumberFormat
                        className="number"
                        value={removeCollateralUSD}
                        displayType="text"
                        thousandSeparator
                        prefix="$"
                        decimalScale={2}
                      />
                    </Form.Text>
                  </Form.Group>
                </Form>
              </Card>
            </div>
            <div className="form-card">
              <Card>
                <div className="info">
                  <h4>{t("vault.debt.title")}</h4>
                  <div>
                    <div className="amount">
                      <TcapIcon className="tcap-neon" />
                      <h4 className=" ml-2 number neon-pink">
                        <NumberFormat
                          className="number"
                          value={vaultDebt}
                          displayType="text"
                          thousandSeparator
                          decimalScale={2}
                        />
                      </h4>
                    </div>
                    <p className="number">
                      <NumberFormat
                        className="number"
                        value={vaultDebtUSD}
                        displayType="text"
                        thousandSeparator
                        prefix="$"
                        decimalScale={parseFloat(vaultDebtUSD) > 1000 ? 0 : 2}
                      />
                    </p>
                  </div>
                </div>
                <Form>
                  <Form.Group>
                    <Form.Label>{t("vault.debt.mint")}</Form.Label>
                    <Form.Label className="max">
                      <a href="/" className="number" onClick={safeMintTCAP}>
                        {t("max-safe")}
                      </a>
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        placeholder=""
                        className="neon-green"
                        value={mintTxt}
                        onChange={onChangeMint}
                      />
                      <InputGroup.Append>
                        <Button className="neon-green" onClick={mintTCAP} disabled={btnDisabled}>
                          +
                        </Button>
                      </InputGroup.Append>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      <NumberFormat
                        className="number"
                        value={mintUSD}
                        displayType="text"
                        thousandSeparator
                        prefix="$"
                        decimalScale={2}
                      />
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className="remove">
                    <Form.Label>{t("vault.debt.burn")}</Form.Label>
                    <Form.Label className="max">
                      <a href="/" className="number orange" onClick={maxBurnTCAP}>
                        {t("max")}
                      </a>
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        placeholder=""
                        className="neon-orange"
                        value={burnTxt}
                        onChange={onChangeBurn}
                      />
                      <InputGroup.Append>
                        <Button className="neon-orange" onClick={burnTCAP} disabled={btnDisabled}>
                          -
                        </Button>
                      </InputGroup.Append>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      <NumberFormat
                        className="number"
                        value={burnUSD}
                        displayType="text"
                        thousandSeparator
                        prefix="$"
                        decimalScale={2}
                      />
                    </Form.Text>
                    <Form.Text className="text-muted burn-fee">
                      {t("vault.debt.fee")}:{" "}
                      <NumberFormat
                        className="number neon-pink"
                        value={burnFee}
                        displayType="text"
                        thousandSeparator
                        decimalScale={4}
                      />{" "}
                      {isPolygon(currentNetwork.chainId) ? "MATIC" : "ETH"}
                    </Form.Text>
                  </Form.Group>
                </Form>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <div className="pre-actions">
          <h5 className="action-title">{title}</h5>
          <p>{text}</p>
          <Button variant="pink neon-pink" onClick={action} disabled={btnDisabled}>
            {title}
          </Button>
        </div>
      )}
    </>
  );
};

export default Details;
