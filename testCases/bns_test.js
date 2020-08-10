const Token = artifacts.require('BNS');
const truffleAssert = require('truffle-assertions');

contract('erc/Token', (accounts) => {
  let token;
  const owner = accounts[0];
  const recipient = accounts[1];
  const allowedAccount = accounts[2];
  const tokenTotalSupply = 250000000000000000;
  const tokenName = "BNS Token";
  const tokenSymbol  = "BNS";
  const tokenDecimals = "8";
  const ownerSupply = 250000000000000000;

  // To send the right amount of tokens, taking in account number of decimals.
  const decimalsMul = 100000000;

  beforeEach(async () => {
    token = await Token.new();
  });

  it('has correct totalSupply after construction', async () => {
    const actualSupply = await token.totalSupply();
    assert.equal(actualSupply.toString(), tokenTotalSupply.toString());
  });

  it('has correct token name after construction', async () => {
    const actualName = await token.name();
    assert.equal(actualName, tokenName);
  });

  it('has correct token symbol after construction', async () => {
    const actualSymbol = await token.symbol();
    assert.equal(actualSymbol, tokenSymbol);
  });

  it('has correct token decimals after construction', async () => {
    const actualDecimals = await token.decimals();
    assert.equal(actualDecimals.toString(), tokenDecimals);
  });

  it('has correct owner token balance after construction', async () => {
    const actualBalance = await token.balanceOf(owner);
    assert.equal(actualBalance.toString(), ownerSupply.toString());
  });

  it('recipient and sender have correct balances after transfer', async () => {
    const tokenAmount = decimalsMul*100;
    let result = await token.transfer(recipient, tokenAmount);

    truffleAssert.eventEmitted(result, 'Transfer', ev => {
        return ev.from == owner && ev.to == recipient && ev.value == tokenAmount;
      }, `transferFrom`);

    const actualSenderBalance = await token.balanceOf(owner);
    const actualRecipientBalance = await token.balanceOf(recipient);
    assert.equal(actualSenderBalance.toString(), (ownerSupply-tokenAmount).toString());
    assert.equal(actualRecipientBalance.toString(), tokenAmount.toString());
  });

  it('emits Transfer event on transfer', async () => {
    const tokenAmount = decimalsMul*100;
    const { logs } = await token.transfer(recipient, tokenAmount);
    const event = logs.find(e => e.event === 'Transfer');
    assert.notEqual(event, undefined);
  });

  it('returns the correct allowance amount after approval', async () => {
    const tokenAmount = decimalsMul*100;
    await token.approve(recipient, tokenAmount);
    const actualAllowance = await token.allowance(owner, recipient);
    assert.equal(actualAllowance.toString(), tokenAmount.toString());
  });

  it('emits Approval event after approval', async () => {
    const tokenAmount = decimalsMul*100;
    const { logs } = await token.approve(recipient, tokenAmount);
    const event = logs.find(e => e.event === 'Approval');
    assert.notEqual(event, undefined);
  });

  it('successfully resets allowance', async () => {
    const tokenAmount = decimalsMul*100;
    const newTokenAmount = decimalsMul*50;
    await token.approve(recipient, tokenAmount);
    await token.approve(recipient, 0);
    await token.approve(recipient, newTokenAmount);
    const actualAllowance = await token.allowance(owner, recipient);
    assert.equal(actualAllowance.toString(), newTokenAmount.toString());
  });

  it('returns correct balances after transfering from another account', async () => {
    const tokenAmount = decimalsMul*100;
    await token.approve(allowedAccount, tokenAmount);
    let result = await token.transferFrom(owner, recipient, tokenAmount, { from: allowedAccount });

    truffleAssert.eventEmitted(result, 'Transfer', ev => {
        return ev.from == owner && ev.to == recipient && ev.value == tokenAmount;
      }, `transferFrom`);

    truffleAssert.eventEmitted(result, 'Approval', ev => {
        return ev.owner == owner && ev.spender == allowedAccount;
      }, `Approval event`);

    const balanceOwner = await token.balanceOf(owner);
    const balanceRecipient = await token.balanceOf(recipient);
    const balanceAllowedAcc = await token.balanceOf(allowedAccount);
    assert.equal(balanceOwner.toString(), (ownerSupply-tokenAmount).toString());
    assert.equal(balanceAllowedAcc.toNumber(), 0);
    assert.equal(balanceRecipient.toNumber(), tokenAmount.toString());
  });

  it('emits Transfer event on transferFrom', async () => {
    const tokenAmount = decimalsMul*100;
    await token.approve(allowedAccount, tokenAmount);
    const { logs } = await token.transferFrom(owner, recipient, tokenAmount,
      { from: allowedAccount });
    const event = logs.find(e => e.event === 'Transfer');
    assert.notEqual(event, undefined);
  });

  it('throws when trying to transferFrom more than allowed amount', async () => {
    const tokenAmountAllowed = decimalsMul*99;
    const tokenAmount = decimalsMul*100;
    await token.approve(allowedAccount, tokenAmountAllowed);
    await truffleAssert.reverts(
      token.transferFrom(owner, recipient, tokenAmount, {from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 
  });

  it('throws an error when trying to transferFrom more than _from has', async () => {
    await token.approve(allowedAccount, 100);
    await truffleAssert.reverts(
      token.transferFrom(owner, recipient, 2000,{from: allowedAccount}),
      "VM Exception while processing transaction: revert"
    ); 
  });

  it('should be able to increaseAllowance', async () => {
    const initiallyAllowed = await token.allowance(owner, recipient);
    let result = await token.increaseAllowance(recipient, 1000);

    const { logs } = await token.increaseAllowance(recipient, 1000);
    const event = logs.find(e => e.event === 'Approval');
    assert.notEqual(event, undefined);

    truffleAssert.eventEmitted(result, 'Approval', ev => {
        return ev.owner === owner && ev.spender === recipient;
      }, `Add allowance to ${recipient}`);

    const finallyAllowed = await token.allowance(owner, recipient);
    assert.equal(initiallyAllowed.toString(), (parseInt(finallyAllowed)-2000).toString());
  });

  it('should be able to decreaseAllowance', async () => {
    await token.increaseAllowance(recipient, 2000);
    const initiallyAllowed = await token.allowance(owner, recipient);
    await token.decreaseAllowance(recipient, 1000);

    const { logs } = await token.decreaseAllowance(recipient, 1000);
    const event = logs.find(e => e.event === 'Approval');
    assert.notEqual(event, undefined);

    const finallyAllowed = await token.allowance(owner, recipient);
    assert.equal(finallyAllowed.toString(),'0');
    assert.equal(initiallyAllowed.toString(), (parseInt(finallyAllowed)+2000).toString());
  });  

});