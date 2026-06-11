// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Base} from "./Base.t.sol";
import {Jar} from "src/Jar.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WithdrawTest is Base {
    uint256 internal constant DEPOSIT_AMOUNT = 100e18;

    function setUp() public override {
        super.setUp();
        _deposit(alice, DEPOSIT_AMOUNT);
    }

    // ---- HAPPY PATH ---- //
    function test_withdrawAll_transfersFullBalanceToOwner() public {
        uint256 ownerBalBefore = token.balanceOf(owner);

        vm.prank(owner);
        jar.withdrawAll();

        assertEq(token.balanceOf(owner), ownerBalBefore + DEPOSIT_AMOUNT);
        assertEq(jar.getCurrentBalance(), 0);
    }

    function test_withdrawAll_returnsAmountWithdrawn() public {
        vm.prank(owner);
        uint256 withdrawn = jar.withdrawAll();

        assertEq(withdrawn, DEPOSIT_AMOUNT);
    }

    function test_withdrawAll_closesJar() public {
        vm.prank(owner);
        jar.withdrawAll();

        assertEq(uint256(jar.getJarStatus()), uint256(Jar.JarStatus.CLOSED));
    }

    function test_withdrawAll_emitsWithdraw() public {
        vm.expectEmit(true, false, false, true, address(jar));
        emit Jar.Withdraw(owner, DEPOSIT_AMOUNT);

        vm.prank(owner);
        jar.withdrawAll();
    }

    function test_withdrawAll_includesDirectTransfers() public {
        // Fund the jar both ways: deposit() in setUp + a raw transfer here.
        vm.prank(bob);
        token.transfer(address(jar), DEPOSIT_AMOUNT);

        uint256 ownerBalBefore = token.balanceOf(owner);

        vm.prank(owner);
        jar.withdrawAll();

        assertEq(token.balanceOf(owner), ownerBalBefore + DEPOSIT_AMOUNT * 2);
    }

    function test_withdrawAll_withZeroBalanceSucceeds() public {
        // Drain first, then deploy a fresh empty jar to withdraw nothing.
        vm.prank(owner);
        Jar empty = new Jar("Empty", address(token), GOAL_AMOUNT);

        vm.prank(owner);
        empty.withdrawAll();

        assertEq(uint256(empty.getJarStatus()), uint256(Jar.JarStatus.CLOSED));
    }

    // ---- REVERT CONDITIONS ---- //
    function test_revertIf_nonOwnerWithdraws() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        jar.withdrawAll();
    }

    // ---- EDGE CASES ---- //
    /// @dev Withdrawing is not one-way: status is just visual, so the owner can
    ///      sweep again. A second call with an empty jar simply transfers nothing.
    function test_withdrawAll_canBeCalledAgain_sweepsNothing() public {
        vm.prank(owner);
        jar.withdrawAll();

        uint256 ownerBalBefore = token.balanceOf(owner);

        vm.prank(owner);
        jar.withdrawAll();

        assertEq(token.balanceOf(owner), ownerBalBefore);
        assertEq(jar.getCurrentBalance(), 0);
    }

    /// @dev Tokens sent directly to the jar after closing are NOT stuck: the
    ///      owner can call withdrawAll again to re-sweep them.
    function test_withdrawAll_directTransferAfterClose_canBeReSwept() public {
        vm.prank(owner);
        jar.withdrawAll();

        vm.prank(bob);
        token.transfer(address(jar), DEPOSIT_AMOUNT);
        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT);

        uint256 ownerBalBefore = token.balanceOf(owner);

        vm.prank(owner);
        jar.withdrawAll();

        assertEq(token.balanceOf(owner), ownerBalBefore + DEPOSIT_AMOUNT);
        assertEq(jar.getCurrentBalance(), 0);
    }
}
