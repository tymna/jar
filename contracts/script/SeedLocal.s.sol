// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {JarFactory} from "src/JarFactory.sol";
import {Jar} from "src/Jar.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

/// @notice One-shot LOCAL seed for exercising the indexer. Deploys a mock
///         ERC20, creates a jar through the already-deployed factory, then
///         deposits twice and bumps the goal — so the indexer's `transaction`
///         table fills (2 DEPOSIT rows) and the jar `balance`/`goal` update.
///
///         Requires JAR_FACTORY_ADDRESS (the factory you already deployed).
///         Run with --broadcast AND --private-key, same as the other scripts.
contract SeedLocal is Script {
    function run() external {
        JarFactory factory = JarFactory(vm.envAddress("JAR_FACTORY_ADDRESS"));
        address sender = msg.sender; // the broadcasting account

        vm.startBroadcast();

        // 1. A spendable token to save into the jar.
        ERC20Mock token = new ERC20Mock();

        // 2. Create a jar that saves this token (owner = sender).
        address jarAddr = factory.createJar("Seeded Jar", address(token), 1000e18);
        Jar jar = Jar(jarAddr);

        // 3. Fund the sender and let the jar pull tokens.
        token.mint(sender, 500e18);
        token.approve(jarAddr, type(uint256).max);

        // 4. Two deposits -> two DEPOSIT rows; balance becomes 300e18.
        jar.deposit(100e18);
        jar.deposit(200e18);

        // 5. Bump the goal -> jar.goal updates to 2000e18.
        jar.changeGoal(2000e18);

        vm.stopBroadcast();

        console.log("Mock token:      ", address(token));
        console.log("Seeded jar:      ", jarAddr);
        console.log("Jar balance (wei):", token.balanceOf(jarAddr));
    }
}
