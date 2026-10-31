// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A plain ERC20 with the Pons token's curve() getter. Test stand-in only.
contract TestToken {
    string public name = "Test";
    string public symbol = "TEST";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public curve;
    mapping(address => uint256) public balanceOf;
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(uint256 supply) {
        totalSupply = supply;
        balanceOf[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    function setCurve(address c) external {
        curve = c;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}

/// A bonding-curve stand-in with the Pons curve's buy() and fee views, priced as in the Pons docs.
contract TestCurve {
    TestToken public token;
    address public escrow;
    uint256 public quoteReserve;
    uint256 public tokenReserve;
    uint256 public feeBps = 100;
    uint256 public creatorTaxBps = 0;
    uint256 public quoteFeeBalance;
    uint256 public creatorTaxBalance;
    /// test switch: the buy pays half of its quote, as a sandwich would
    bool public rigged;

    constructor(TestToken t, address e, uint256 q, uint256 r) {
        token = t;
        escrow = e;
        quoteReserve = q;
        tokenReserve = r;
    }

    function setRigged(bool r) external {
        rigged = r;
    }

    function addFees() external payable {
        quoteFeeBalance += msg.value;
    }

    function getReserves() external view returns (uint256, uint256) {
        return (quoteReserve, tokenReserve);
    }

    function sellableTokens() external view returns (uint256) {
        return tokenReserve;
    }

    function currentSnipeTaxBps(address) external pure returns (uint256) {
        return 0;
    }

    function sweepFees(uint256) external {
        uint256 amount = quoteFeeBalance;
        quoteFeeBalance = 0;
        (bool sent, ) = escrow.call{value: amount}("");
        require(sent, "sweep");
    }

    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256 out) {
        require(msg.value == quoteIn, "value");
        uint256 fee = (quoteIn * feeBps) / 10000;
        quoteFeeBalance += fee;
        uint256 net = quoteIn - fee;
        out = (net * tokenReserve) / (quoteReserve + net);
        quoteReserve += net;
        tokenReserve -= out;
        if (rigged) out /= 2;
        require(out >= minTokensOut, "slippage");
        require(token.transfer(recipient, out), "transfer");
    }
}
