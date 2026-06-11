// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {JarFactory} from "src/JarFactory.sol";
import {Jar} from "src/Jar.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

/// @notice End-to-end lifecycle: a user creates a jar through the factory
///         (the same call DeployJar makes), funds it, and withdraws everything.
contract FlowTest is Test {
    JarFactory public factory;
    ERC20Mock public token;

    address alice = makeAddr("alice"); // jar creator / owner
    address bob = makeAddr("bob"); // gifter (direct transfer)

    string internal constant JAR_NAME = "Trip to Japan";
    uint256 internal constant GOAL_AMOUNT = 5000e18;
    uint256 internal constant DEPOSIT_AMOUNT = 300e18;
    uint256 internal constant GIFT_AMOUNT = 200e18;

    function setUp() public {
        factory = new JarFactory(address(this));
        token = new ERC20Mock();
        factory.addAllowedToken(address(token));

        token.mint(alice, 1000e18);
        token.mint(bob, 1000e18);
    }

    // ---- FLOW ---- //
    function test_flow_createDepositGiftWithdraw() public {
        // 1. Alice creates a jar through the factory (what DeployJar / the frontend does).
        vm.prank(alice);
        Jar jar = Jar(factory.createJar(JAR_NAME, address(token), GOAL_AMOUNT));

        assertEq(jar.owner(), alice);
        assertEq(jar.getName(), JAR_NAME);
        assertEq(jar.getGoalAmount(), GOAL_AMOUNT);
        assertEq(uint256(jar.getJarStatus()), uint256(Jar.JarStatus.ACTIVE));

        // 2. Alice deposits via deposit().
        vm.startPrank(alice);
        token.approve(address(jar), DEPOSIT_AMOUNT);
        jar.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        // 3. Bob gifts by transferring tokens straight to the jar (no deposit() call).
        vm.prank(bob);
        token.transfer(address(jar), GIFT_AMOUNT);

        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT + GIFT_AMOUNT);

        // 4. Alice bumps the goal mid-way — visual only, balance untouched.
        vm.prank(alice);
        jar.changeGoal(8000e18);
        assertEq(jar.getGoalAmount(), 8000e18);
        assertEq(jar.getCurrentBalance(), DEPOSIT_AMOUNT + GIFT_AMOUNT);

        // 5. Alice withdraws everything (deposited + gifted).
        uint256 aliceBefore = token.balanceOf(alice);

        vm.prank(alice);
        uint256 withdrawn = jar.withdrawAll();

        assertEq(withdrawn, DEPOSIT_AMOUNT + GIFT_AMOUNT);
        assertEq(token.balanceOf(alice), aliceBefore + DEPOSIT_AMOUNT + GIFT_AMOUNT);
        assertEq(jar.getCurrentBalance(), 0);
        assertEq(uint256(jar.getJarStatus()), uint256(Jar.JarStatus.CLOSED));
    }

    function test_flow_onlyCreatorCanWithdraw() public {
        vm.prank(alice);
        Jar jar = Jar(factory.createJar(JAR_NAME, address(token), GOAL_AMOUNT));

        vm.startPrank(alice);
        token.approve(address(jar), DEPOSIT_AMOUNT);
        jar.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        // Bob is not the owner — cannot drain Alice's jar.
        vm.prank(bob);
        vm.expectRevert();
        jar.withdrawAll();
    }
}
