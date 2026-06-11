// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Base} from "./Base.t.sol";
import {Jar} from "src/Jar.sol";

contract DeploymentTest is Base {
    function setUp() public override {
        super.setUp();
    }

    // ---- CONSTRUCTOR / GETTERS ---- //
    function test_deploy_setsName() public view {
        assertEq(jar.getName(), JAR_NAME);
    }

    function test_deploy_setsToken() public view {
        assertEq(jar.getToken(), address(token));
    }

    function test_deploy_setsGoalAmount() public view {
        assertEq(jar.getGoalAmount(), GOAL_AMOUNT);
    }

    function test_deploy_setsOwnerToDeployer() public view {
        assertEq(jar.owner(), owner);
    }

    function test_deploy_startsActive() public view {
        assertEq(uint256(jar.getJarStatus()), uint256(Jar.JarStatus.ACTIVE));
    }

    function test_deploy_startsWithZeroBalance() public view {
        assertEq(jar.getCurrentBalance(), 0);
    }

    // ---- REVERT CONDITIONS ---- //
    function test_revertIf_deployWithZeroToken() public {
        vm.expectRevert(Jar.TokenAddressCannotBeZero.selector);
        new Jar(JAR_NAME, address(0), GOAL_AMOUNT);
    }

    function test_revertIf_deployWithZeroGoal() public {
        vm.expectRevert(Jar.AmountMustBeGreaterThanZero.selector);
        new Jar(JAR_NAME, address(token), 0);
    }

    // ---- OWNERSHIP ---- //
    function test_transferOwnership_isImmediate() public {
        vm.prank(owner);
        jar.transferOwnership(alice);

        assertEq(jar.owner(), alice);
    }
}
