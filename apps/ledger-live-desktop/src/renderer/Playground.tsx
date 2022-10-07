import React, { useCallback, useEffect, useState } from "react";
import Input from "~/renderer/components/Input";
import DeviceAction from "~/renderer/components/DeviceAction";

import styled from "styled-components";

import { command } from "~/renderer/commands";
import { createAction } from "~/renderer/bidirectionalTestAction";

const Wrapper = styled.div`
  background: white;
  padding: 20px;
  color: black;
`;

const Button = styled.div`
  background: white;
  display: inline-block;
  padding: 8px;
  border-radius: 4px;
  margin-right: 10px;
  border: 1px solid black;
  color: black;
`;

const action = createAction(command("connectApp"), command("bidirectionalTest"));

export const PlaygroundControls = ({ subject }: any) => {
  const [apduHex, setAPDU] = useState("");
  const [completed, setCompleted] = useState(false);

  const onSend = useCallback(() => {
    subject?.next({ type: "input-frame", apduHex });
  }, [apduHex, subject]);

  const onClose = useCallback(() => {
    subject?.complete();
    setCompleted(true);
  }, [subject]);

  return (
    <Wrapper>
      {completed ? (
        <div>{"Connection closed"}</div>
      ) : (
        <>
          <Input value={apduHex} onChange={setAPDU} />
          <Button onClick={onSend}>{"Send APDU"}</Button>
          <Button onClick={onClose}>{"Close connection"}</Button>
        </>
      )}
    </Wrapper>
  );
};
export default function Playground() {
  return (
    <Wrapper>
      <DeviceAction action={action} request={null} />
    </Wrapper>
  );
}
