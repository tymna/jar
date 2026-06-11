// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Base} from "./Base.t.sol";
import {Jar} from "src/Jar.sol";

contract DepositTest is Base {
    uint256 internal constant DEPOSIT_AMOUNT = 100e18;

    function setUp() public override {
        super.setUp();
    }

    // ---- HAPPY PATH ---- //
    function test_deposit_pullsTokensFromCaller() public {
        uint256 balBefore = token.balanceOf(alice);

        _deposit(alice, DEPOSIT_AMOUNT);

        assertEq(token.balanceOf(alice), balBefore - DEPOSIT_AMOUNT);
        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT);
    }

    function test_deposit_emitsDeposit() public {
        vm.expectEmit(true, false, false, true, address(jar));
        emit Jar.Deposit(alice, DEPOSIT_AMOUNT);

        _deposit(alice, DEPOSIT_AMOUNT);
    }

    function test_deposit_anyoneCanDeposit() public {
        _deposit(alice, DEPOSIT_AMOUNT);
        _deposit(bob, DEPOSIT_AMOUNT);

        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT * 2);
    }

    function test_deposit_accumulatesAcrossCalls() public {
        _deposit(alice, DEPOSIT_AMOUNT);
        _deposit(alice, DEPOSIT_AMOUNT);

        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT * 2);
    }

    // ---- EDGE CASES ---- //
    /// @dev A direct ERC20 transfer (no deposit() call) also funds the jar,
    ///      because balance is read via balanceOf. No Deposit event is emitted.
    function test_deposit_directTransferFundsJar() public {
        vm.prank(alice);
        token.transfer(address(jar), DEPOSIT_AMOUNT);

        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT);
    }

    /// @dev Status is purely visual: a CLOSED jar still accepts deposits.
    function test_deposit_worksAfterClose() public {
        vm.prank(owner);
        jar.withdrawAll();
        assertEq(uint256(jar.getJarStatus()), uint256(Jar.JarStatus.CLOSED));

        _deposit(alice, DEPOSIT_AMOUNT);

        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT);
    }

    // ---- REVERT CONDITIONS ---- //
    function test_revertIf_depositZero() public {
        vm.prank(alice);
        vm.expectRevert(Jar.AmountMustBeGreaterThanZero.selector);
        jar.deposit(0);
    }

    function test_revertIf_depositExceedsBalance() public {
        vm.prank(alice);
        vm.expectRevert();
        jar.deposit(INITIAL_BALANCE + 1);
    }
}
