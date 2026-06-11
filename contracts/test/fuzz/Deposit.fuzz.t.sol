// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Base} from "../unit/Base.t.sol";
import {Jar} from "src/Jar.sol";

contract DepositFuzzTest is Base {
    function setUp() public override {
        super.setUp();
    }

    /// @dev Invariant: jar balance always equals the sum of deposited amounts.
    function testFuzz_deposit_balanceTracksAmount(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);

        _deposit(alice, amount);

        assertEq(jar.getCurrentBalance(), amount);
        assertEq(token.balanceOf(alice), INITIAL_BALANCE - amount);
    }

    /// @dev Two deposits from different actors accumulate exactly.
    function testFuzz_deposit_accumulates(uint256 a, uint256 b) public {
        a = bound(a, 1, INITIAL_BALANCE);
        b = bound(b, 1, INITIAL_BALANCE);

        _deposit(alice, a);
        _deposit(bob, b);

        assertEq(jar.getCurrentBalance(), a + b);
    }

    /// @dev Owner always recovers the full balance, regardless of deposit size.
    function testFuzz_withdrawAll_returnsEntireBalance(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);
        _deposit(alice, amount);

        uint256 ownerBalBefore = token.balanceOf(owner);

        vm.prank(owner);
        jar.withdrawAll();

        assertEq(token.balanceOf(owner), ownerBalBefore + amount);
        assertEq(jar.getCurrentBalance(), 0);
    }
}
