// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, Vm} from "forge-std/Test.sol";
import {JarFactory} from "src/JarFactory.sol";
import {Jar} from "src/Jar.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract JarFactoryTest is Test {
    JarFactory public factory;
    ERC20Mock public token;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    string internal constant JAR_NAME = "Trip to Japan";
    uint256 internal constant GOAL_AMOUNT = 5000e18;

    function setUp() public {
        factory = new JarFactory(admin);
        token = new ERC20Mock();

        vm.prank(admin);
        factory.addAllowedToken(address(token));
    }

    // ---- HELPERS ---- //
    /// @dev Calls createJar as `actor` and returns the jar via the function's return value.
    function _createJar(address actor) internal returns (Jar jar) {
        vm.prank(actor);
        jar = Jar(factory.createJar(JAR_NAME, address(token), GOAL_AMOUNT));
    }

    // ---- HAPPY PATH ---- //
    function test_createJar_returnsDeployedJarAddress() public {
        Jar jar = _createJar(alice);

        assertTrue(address(jar) != address(0));
        assertTrue(address(jar).code.length > 0);
    }

    function test_createJar_ownerIsCaller() public {
        Jar jar = _createJar(alice);
        assertEq(jar.owner(), alice);
    }

    function test_createJar_factoryDoesNotOwnJar() public {
        Jar jar = _createJar(alice);
        assertTrue(jar.owner() != address(factory));
    }

    function test_createJar_emitsJarCreatedWithCallerAsOwner() public {
        vm.recordLogs();
        vm.prank(alice);
        address jarAddr = factory.createJar(JAR_NAME, address(token), GOAL_AMOUNT);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 sig = keccak256("JarCreated(address,address,string,address,uint256)");

        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == sig) {
                found = true;
                // topics[1] = jar, topics[2] = owner
                assertEq(address(uint160(uint256(logs[i].topics[1]))), jarAddr);
                assertEq(address(uint160(uint256(logs[i].topics[2]))), alice);
            }
        }
        assertTrue(found);
    }

    function test_createJar_storesConstructorArgs() public {
        Jar jar = _createJar(alice);

        assertEq(jar.getName(), JAR_NAME);
        assertEq(jar.getToken(), address(token));
        assertEq(jar.getGoalAmount(), GOAL_AMOUNT);
    }

    function test_createJar_distinctJarsPerCall() public {
        Jar jarA = _createJar(alice);
        Jar jarB = _createJar(bob);

        assertTrue(address(jarA) != address(jarB));
        assertEq(jarA.owner(), alice);
        assertEq(jarB.owner(), bob);
    }

    // ---- ALLOWLIST ---- //
    function test_deploy_setsAdminAsOwner() public view {
        assertEq(factory.owner(), admin);
    }

    function test_addAllowedToken_allowsToken() public {
        ERC20Mock other = new ERC20Mock();
        assertFalse(factory.isAllowedToken(address(other)));

        vm.prank(admin);
        factory.addAllowedToken(address(other));

        assertTrue(factory.isAllowedToken(address(other)));
    }

    function test_addAllowedToken_emitsAllowedTokenAdded() public {
        vm.expectEmit(true, false, false, false, address(factory));
        emit JarFactory.AllowedTokenAdded(address(token));

        vm.prank(admin);
        factory.addAllowedToken(address(token));
    }

    /// @dev The full allowlist cycle: allowed -> createJar works,
    ///      removed -> createJar reverts.
    function test_removeAllowedToken_disallowsToken() public {
        assertTrue(factory.isAllowedToken(address(token)));
        _createJar(alice);

        vm.prank(admin);
        factory.removeAllowedToken(address(token));

        assertFalse(factory.isAllowedToken(address(token)));
        vm.prank(alice);
        vm.expectRevert(JarFactory.TokenIsNotAllowed.selector);
        factory.createJar(JAR_NAME, address(token), GOAL_AMOUNT);
    }

    function test_removeAllowedToken_emitsAllowedTokenRemoved() public {
        vm.expectEmit(true, false, false, false, address(factory));
        emit JarFactory.AllowedTokenRemoved(address(token));

        vm.prank(admin);
        factory.removeAllowedToken(address(token));
    }

    /// @dev Removing a token that was never allowed is a harmless no-op.
    function test_removeAllowedToken_neverAllowedIsNoOp() public {
        ERC20Mock other = new ERC20Mock();

        vm.prank(admin);
        factory.removeAllowedToken(address(other));

        assertFalse(factory.isAllowedToken(address(other)));
    }

    // ---- REVERT CONDITIONS ---- //
    function test_revertIf_createJarWithNotAllowedToken() public {
        ERC20Mock other = new ERC20Mock();

        vm.prank(alice);
        vm.expectRevert(JarFactory.TokenIsNotAllowed.selector);
        factory.createJar(JAR_NAME, address(other), GOAL_AMOUNT);
    }

    function test_revertIf_nonOwnerAddsAllowedToken() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.addAllowedToken(address(token));
    }

    function test_revertIf_nonOwnerRemovesAllowedToken() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.removeAllowedToken(address(token));
    }

    /// @dev address(0) is never allowlisted, so it fails the allowlist check
    ///      before ever reaching the Jar constructor's zero-token validation.
    function test_revertIf_createJarWithZeroToken() public {
        vm.prank(alice);
        vm.expectRevert(JarFactory.TokenIsNotAllowed.selector);
        factory.createJar(JAR_NAME, address(0), GOAL_AMOUNT);
    }

    // ---- EDGE CASES ---- //
    /// @dev A factory-created jar is fully functional: owner can deposit and sweep.
    function test_createJar_jarIsFunctional() public {
        Jar jar = _createJar(alice);

        token.mint(alice, 100e18);
        vm.startPrank(alice);
        token.approve(address(jar), 100e18);
        jar.deposit(100e18);
        jar.withdrawAll();
        vm.stopPrank();

        assertEq(token.balanceOf(alice), 100e18);
    }
}
