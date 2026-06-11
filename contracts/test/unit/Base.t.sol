// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Jar} from "src/Jar.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

abstract contract Base is Test {
    Jar public jar;
    ERC20Mock public token;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    string internal constant JAR_NAME = "Trip to Japan";
    uint256 internal constant GOAL_AMOUNT = 5000e18;
    uint256 internal constant INITIAL_BALANCE = 1000e18;

    function setUp() public virtual {
        token = new ERC20Mock();

        // The constructor sets owner = msg.sender, so deploy as `owner`.
        vm.prank(owner);
        jar = new Jar(JAR_NAME, address(token), GOAL_AMOUNT);

        _fundActor(alice);
        _fundActor(bob);
    }

    // ---- HELPERS ---- //
    function _fundActor(address actor) internal {
        token.mint(actor, INITIAL_BALANCE);
        vm.prank(actor);
        token.approve(address(jar), type(uint256).max);
    }

    function _deposit(address actor, uint256 amount) internal {
        vm.prank(actor);
        jar.deposit(amount);
    }
}
