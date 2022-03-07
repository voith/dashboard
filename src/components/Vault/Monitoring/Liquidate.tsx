import React, { useContext, useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { ethers, BigNumber } from "ethers";
import Modal from "react-bootstrap/esm/Modal";
import NumberFormat from "react-number-format";
import "../../../styles/modal.scss";
import NetworkContext from "../../../state/NetworkContext";
import SignerContext from "../../../state/SignerContext";
import VaultContext from "../../../state/VaultsContext";
import { errorNotification, notifyUser } from "../../../utils/utils";
import { NETWORKS } from "../../../utils/constants";

type props = {
  show: boolean;
  currentAddress: string;
  vaultId: string;
  vaultType: string;
  onHide: () => void;
  refresh: () => void;
};

const Liquidate = ({ show, currentAddress, vaultId, vaultType, onHide, refresh }: props) => {
  const currentNetwork = useContext(NetworkContext);
  const signer = useContext(SignerContext);
  const vaults = useContext(VaultContext);
  const [currentVault, setCurrentVault] = useState<ethers.Contract>();
  const [requiredTcap, setRequiredTcap] = useState("0");
  const [maxTcap, setMaxTcap] = useState("0");
  const [liquidationFee, setLiquidationFee] = useState("0");
  const [canLiquidate, setCanLiquidate] = useState(true);

  useEffect(() => {
    async function load() {
      if (currentAddress !== "" && vaults) {
        let cVault = vaults.wethVault;
        let cVaultRead = vaults.wethVaultRead;
        switch (vaultType) {
          case "DAI":
            cVault = vaults.daiVault;
            cVaultRead = vaults.daiVaultRead;
            break;
          case "AAVE":
            cVault = vaults.aaveVault;
            cVaultRead = vaults.aaveVaultRead;
            break;
          case "LINK":
            cVault = vaults.linkVault;
            cVaultRead = vaults.linkVaultRead;
            break;
          case "SNX":
            cVault = vaults.snxVault;
            cVaultRead = vaults.snxVaultRead;
            break;
          case "UNI":
            cVault = vaults.uniVault;
            cVaultRead = vaults.uniVaultRead;
            break;
          case "MATIC":
            cVault = vaults.maticVault;
            cVaultRead = vaults.maticVaultRead;
            break;
          case "WBTC":
            cVault = vaults.wbtcVault;
            cVaultRead = vaults.wbtcVaultRead;
            break;
          default:
            cVault = vaults.wethVault;
            cVaultRead = vaults.wethVaultRead;
            break;
        }
        if (vaultId !== "" && cVault && cVaultRead) {
          setCurrentVault(cVault);
          const reqTcapCall = await cVaultRead?.requiredLiquidationTCAP(BigNumber.from(vaultId));
          // @ts-ignore
          const [reqTcap] = await signer.ethcallProvider?.all([reqTcapCall]);
          const reqTcapText = ethers.utils.formatEther(reqTcap);

          const currentLiqFee = await cVault?.getFee(reqTcap);
          const increasedFee = currentLiqFee.add(currentLiqFee.div(100)).toString();
          const ethFee = ethers.utils.formatEther(increasedFee);
          setRequiredTcap(reqTcapText);
          setLiquidationFee(ethFee.toString());
        }
      }
    }
    load();
    // eslint-disable-next-line
  }, [currentAddress, vaultId]);

  const onChangeMaxTcap = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMaxTcap(event.target.value);
  };

  const minTcap = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMaxTcap(requiredTcap);
  };

  const liquidate = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (currentAddress && canLiquidate && currentVault) {
      setCanLiquidate(false);
      if (maxTcap && parseFloat(maxTcap) > 0) {
        if (parseFloat(maxTcap) >= parseFloat(requiredTcap)) {
          try {
            const currentLiqFee = await currentVault?.getFee(ethers.utils.parseEther(requiredTcap));
            const increasedFee = currentLiqFee.add(currentLiqFee.div(100)).toString();
            const ethFee = ethers.utils.formatEther(increasedFee);
            setLiquidationFee(ethFee);
            const tx = await currentVault.liquidateVault(
              BigNumber.from(vaultId),
              ethers.utils.parseEther(maxTcap),
              { value: increasedFee }
            );
            notifyUser(tx, refresh);
            setMaxTcap("");
            onHide();
          } catch (error) {
            errorNotification("Burn fee less than required.");
          }
        } else {
          errorNotification("Tcap amount is less than required");
        }
      } else {
        errorNotification("Field can't be empty");
      }
      setCanLiquidate(true);
    }
  };

  return (
    <Modal
      show={show}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      onHide={() => {
        setMaxTcap("");
        onHide();
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">Liquidate Vault</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="diamond" />
        <Form>
          <Form.Group className="" controlId="">
            <>
              <Form.Label>Amount of TCAP</Form.Label>
              <Form.Label className="max">
                <a href="/" className="number" onClick={minTcap}>
                  MIN
                </a>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="0"
                className="neon-green"
                value={maxTcap}
                onChange={onChangeMaxTcap}
              />
              <Form.Text className="text-muted liquidation-fee">
                Liquidation Fee:{" "}
                <NumberFormat
                  className="number neon-pink"
                  value={liquidationFee}
                  displayType="text"
                  thousandSeparator
                  decimalScale={4}
                />{" "}
                {currentNetwork.chainId === NETWORKS.polygon.chainId ? "MATIC" : "ETH"}
              </Form.Text>
            </>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="pink"
          className="mt-3 mb-4 w-100"
          onClick={liquidate}
          disabled={!canLiquidate}
        >
          {canLiquidate ? "Liquidate Vault" : "Liquidating"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default Liquidate;