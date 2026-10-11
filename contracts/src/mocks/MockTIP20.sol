// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// Fake TIP-20 token used only by the local tests. Never deployed.
contract MockTIP20 {
    mapping(address => uint256) public balanceOf;

    event TransferWithMemo(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes32 indexed memo
    );

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transferWithMemo(address to, uint256 amount, bytes32 memo) external {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit TransferWithMemo(msg.sender, to, amount, memo);
    }
}
