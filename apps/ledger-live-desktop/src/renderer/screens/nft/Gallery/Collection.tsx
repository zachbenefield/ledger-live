import React, { useMemo, useCallback, useRef, useState, useEffect, memo } from "react";
import { useParams, useHistory } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { nftsByCollections } from "@ledgerhq/live-common/nft/index";
import { useNftMetadata } from "@ledgerhq/live-common/nft/NftMetadataProvider/index";
import { accountSelector } from "~/renderer/reducers/accounts";
import { openModal } from "~/renderer/actions/modals";
import styled from "styled-components";
import useOnScreen from "../useOnScreen";
import Media from "~/renderer/components/Nft/Media";
import IconSend from "~/renderer/icons/Send";
import TokensList from "./TokensList";
import Spinner from "~/renderer/components/Spinner";
import Box from "~/renderer/components/Box";
import Button from "~/renderer/components/Button";
import Text from "~/renderer/components/Text";
import OperationsList from "~/renderer/components/OperationsList";
import CollectionName from "~/renderer/components/Nft/CollectionName";
import GridListToggle from "./GridListToggle";
import Skeleton from "~/renderer/components/Nft/Skeleton";
import { State } from "~/renderer/reducers";
import { NFT, NFTMetadata, Operation, ProtoNFT } from "@ledgerhq/types-live";
const SpinnerContainer = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;
const SpinnerBackground = styled.div`
  background: ${p => p.theme.colors.palette.background.paper};
  border-radius: 100%;
  padding: 2px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${p => p.theme.colors.palette.background.paper};
`;
const Collection = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { id, collectionAddress } = useParams<{ collectionAddress: string; id: string }>();
  const account = useSelector((state: State) =>
    accountSelector(state, {
      accountId: id,
    }),
  );
  const history = useHistory();
  const nfts = useMemo<(ProtoNFT | NFT)[]>(
    () => (nftsByCollections(account?.nfts, collectionAddress) as (ProtoNFT | NFT)[]) || [],
    [account?.nfts, collectionAddress],
  );
  const [nft] = nfts;
  const { status, metadata } = useNftMetadata(nft?.contract, nft?.tokenId, account?.currency.id);
  const show = useMemo(() => status === "loading", [status]);
  const onSend = useCallback(() => {
    dispatch(
      openModal("MODAL_SEND", {
        account,
        isNFTSend: true,
        nftCollection: collectionAddress,
      }),
    );
  }, [collectionAddress, dispatch, account]);
  const onCollectionHide = useCallback(() => {
    history.replace(`/account/${account?.id}/`);
  }, [account?.id, history]);

  // NB To be determined if this filter is good enough for what we expect.
  const filterOperation = (op: Operation) =>
    !!op.nftOperations?.length &&
    !!op.nftOperations.find(nftOp => nftOp?.contract === collectionAddress);
  const ref = useRef(null);
  const isAtBottom = useOnScreen(ref);
  const [maxVisibleNTFs, setMaxVisibleNFTs] = useState(1);
  useEffect(() => {
    if (isAtBottom && maxVisibleNTFs < nfts.length) {
      setMaxVisibleNFTs(maxVisibleNTFs => maxVisibleNTFs + 5);
    }
    // Exception to the rule, other deps must not be provided in this case
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAtBottom]);
  const slicedNfts = useMemo(() => nfts.slice(0, maxVisibleNTFs), [nfts, maxVisibleNTFs]);

  // Should redirect to the account page if there is not NFT anymore in the page.
  useEffect(() => {
    if (slicedNfts.length <= 0) {
      history.push(`/account/${account?.id}/`);
    }
  }, [account?.id, history, slicedNfts.length]);
  return (
    <>
      <Box horizontal alignItems="center" mb={6}>
        <Skeleton width={40} minHeight={40} show={show}>
          <Media
            size={40}
            metadata={metadata as NFTMetadata}
            tokenId={nft?.tokenId}
            mediaFormat="preview"
          />
        </Skeleton>
        <Box flex={1} ml={3}>
          <Skeleton width={93} barHeight={6} minHeight={24} show={show}>
            <Text ff="Inter|Regular" color="palette.text.shade60" fontSize={2}>
              {t("NFT.gallery.collection.header.contract", {
                contract: collectionAddress,
              })}
            </Text>
          </Skeleton>
          <Skeleton width={143} minHeight={33} barHeight={12} show={show}>
            <Text ff="Inter|SemiBold" color="palette.text.shade100" fontSize={22}>
              <CollectionName nft={nfts[0]} />
            </Text>
          </Skeleton>
        </Box>
        <Button small primary icon onClick={onSend}>
          <Box horizontal flow={1} alignItems="center">
            <IconSend size={12} />
            <Box>{t("NFT.gallery.collection.header.sendCTA")}</Box>
          </Box>
        </Button>
      </Box>
      <GridListToggle />
      {account && (
        <TokensList account={account} nfts={slicedNfts} onHideCollection={onCollectionHide} />
      )}
      {nfts.length > maxVisibleNTFs && (
        <SpinnerContainer>
          <SpinnerBackground>
            <Spinner size={14} />
          </SpinnerBackground>
        </SpinnerContainer>
      )}
      <div ref={ref} />
      <OperationsList
        account={account}
        title={t("NFT.gallery.collection.operationList.header")}
        filterOperation={collectionAddress ? filterOperation : undefined}
        t={t}
      />
    </>
  );
};
export default memo<{}>(Collection);
