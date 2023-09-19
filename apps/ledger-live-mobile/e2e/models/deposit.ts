import { expect, element, by } from "detox";
import {
  getElementById,
  tapById,
  getElementByText,
  waitForElementById,
  typeTextByElement,
  tapByText,
  tapByElement,
  waitForElementByText,
} from "../helpers";

export default class depositPage {
  searchBar = () => getElementById("common-search-field");
  //account = (item: string) => getElementById(`test-id-account-${item}`);
  buttonVerifyAddressId = "button-verify-my-address";
  buttonVerifyAddress = () => getElementById(this.buttonVerifyAddressId);
  buttonDontVerifyAddressId = "button-DontVerify-my-address";
  buttonDontVerifyAddress = () => getElementById(this.buttonDontVerifyAddressId);
  currencyRowInNetworkListId = getElementById("big-currency-row-");
  numberOfAccountInNetworkListId = getElementById("subtitle-row-");
  buttonCloseQrDepositPage = () => getElementById("NavigationHeaderCloseButton");
  buttonCreateAccount = () => getElementById("button-create-account");
  buttonContinueID = "add-accounts-continue-button";
  buttonContinue = () => getElementById(this.buttonContinueID);
  depositStep2TitleId = "receive-header-step2-title";
  depositStep2Title = () => getElementById(this.depositStep2TitleId);
  buttonConfirmDontVerifyAddressId = "button-confirm-dont-verify";
  buttonConfirmDontVerifyAddress = () => getElementById(this.buttonConfirmDontVerifyAddressId);
  titleDepositConfirmationPageId = "deposit-confirmation-title-";
  accountNameDepositId = "deposit-account-name-";
  //button-confirm-dont-verify

  async searchAsset(asset: string) {
    await waitForElementById("common-search-field");
    return typeTextByElement(this.searchBar(), asset);
  }

  async selectAsset(asset: string) {
    await waitForElementByText(asset);
    return tapByText(asset);
  }

  async selectAccount(account: string) {
    const id = "test-id-account-" + account;
    await waitForElementById(id);
    return tapById(id);
  }

  async selectVerifyAddress() {
    await waitForElementById(this.buttonVerifyAddressId);
    return tapByElement(this.buttonVerifyAddress());
  }

  async expectAddressIsVerified(address: string) {
    await waitForElementByText(address);
    await expect(getElementByText(address)).toBeVisible();
    await expect(getElementByText("Verify address")).toBeVisible();
  }

  expectNumberOfAccountInListIsDisplayed(currencyName: string, accountNumber: number) {
    const pluralization: string = accountNumber > 1 ? "accounts" : "account";
    const currencyRowNameID = this.currencyRowInNetworkListId + currencyName;
    const accountCountRowID =
      this.numberOfAccountInNetworkListId + pluralization + " " + accountNumber;
    expect(element(by.id(currencyRowNameID).withDescendant(by.id(accountCountRowID))));
  }

  closeQrCodeDepositPage() {
    return tapByElement(this.buttonCloseQrDepositPage());
  }

  createAccount() {
    return tapByElement(this.buttonCreateAccount());
  }

  async continueCreateAccount() {
    await waitForElementById(this.buttonContinueID);
    return tapByElement(this.buttonContinue());
  }

  async expectAccountIsCreated(accountName: string) {
    //check the right page is displayed
    await waitForElementById(this.depositStep2TitleId);
    await expect(this.depositStep2Title()).toBeVisible();
    await expect(getElementByText(accountName)).toBeVisible();
  }

  async selectDontVerifyAddress() {
    await waitForElementById(this.buttonDontVerifyAddressId);
    return tapByElement(this.buttonDontVerifyAddress());
  }

  async selectReconfirmDontVerify() {
    await waitForElementById(this.buttonConfirmDontVerifyAddressId);
    return tapByElement(this.buttonConfirmDontVerifyAddress());
  }

  async expectDepositPageIsDisplayed(tickerName: string, accountName: string) {
    const depositTitleTickerId = this.titleDepositConfirmationPageId + tickerName;
    const accountNameId = this.accountNameDepositId + accountName;
    await waitForElementById(depositTitleTickerId);
    await expect(getElementById(depositTitleTickerId)).toBeVisible();
    await expect(getElementById(accountNameId)).toBeVisible();
  }
  /*
  clearSearchField() {
    return tapByElement();
  }*/
}
