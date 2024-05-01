import React from "react";
import loadable from "@loadable/component";

const Claim = loadable(() => import("../components/Claim"));

export default function Mint({
  candyMachineId,
  connection,
  txTimeout,
  rpcHost,
  network,
  error,
}) {
  return (
    <Claim
      candyMachineId={candyMachineId}
      connection={connection}
      txTimeout={txTimeout}
      rpcHost={rpcHost}
      network={network}
      error={error}
    />
  );
}
