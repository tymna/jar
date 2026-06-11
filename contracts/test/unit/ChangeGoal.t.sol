// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Base} from "./Base.t.sol";
import {Jar} from "src/Jar.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ChangeGoalTest is Base {
    uint256 internal constant NEW_GOAL = 9000e18;

    function setUp() public override {
        super.setUp();
    }

    // ---- HAPPY PATH ---- //
    function test_changeGoal_updatesGoal() public {
        vm.prank(owner);
        jar.changeGoal(NEW_GOAL);

        assertEq(jar.getGoalAmount(), NEW_GOAL);
    }

    function test_changeGoal_emitsGoalAmountChanged() public {
        vm.expectEmit(false, false, false, true, address(jar));
        emit Jar.GoalAmountChanged(GOAL_AMOUNT, NEW_GOAL);

        vm.prank(owner);
        jar.changeGoal(NEW_GOAL);
    }

    // ---- EDGE CASES ---- //
    /// @dev Goal is purely visual: changing it does not touch the balance.
    function test_changeGoal_doesNotAffectBalance() public {
        _deposit(alice, 100e18);

        vm.prank(owner);
        jar.changeGoal(NEW_GOAL);

        assertEq(jar.getCurrentBalance(), 100e18);
    }

    // ---- REVERT CONDITIONS ---- //
    function test_revertIf_changeGoalToZero() public {
        vm.prank(owner);
        vm.expectRevert(Jar.AmountMustBeGreaterThanZero.selector);
        jar.changeGoal(0);
    }

    function test_revertIf_nonOwnerChangesGoal() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        jar.changeGoal(NEW_GOAL);
    }
}
