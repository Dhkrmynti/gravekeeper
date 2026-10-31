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

/// A bonding-curve stand-in with the Pons curve's buy() signature: a fixed rate that worsens with each buy.
contract TestCurve {
    TestToken public token;
    uint256 public rate; // tokens (wei) per wei of ETH

    constructor(TestToken t, uint256 r) {
        token = t;
        rate = r;
    }

    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256 out) {
        require(msg.value == quoteIn, "value");
        out = quoteIn * rate;
        require(out >= minTokensOut, "slippage");
        rate = (rate * 99) / 100;
        require(token.transfer(recipient, out), "transfer");
    }
}
