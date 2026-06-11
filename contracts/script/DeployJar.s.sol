// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {JarFactory} from "src/JarFactory.sol";

/// @notice Creates a single jar through an already-deployed JarFactory.
///         The factory address comes from the JAR_FACTORY_ADDRESS env var,
///         so this script reuses the one factory deployed by DeployJarFactory.
contract DeployJar is Script {
    function run() external returns (address jar) {
        JarFactory factory = JarFactory(vm.envAddress("JAR_FACTORY_ADDRESS"));

        string memory name = vm.envString("JAR_NAME");
        address token = vm.envAddress("JAR_TOKEN");
        uint256 goal = vm.envUint("JAR_GOAL");

        vm.startBroadcast();
        jar = factory.createJar(name, token, goal);
        vm.stopBroadcast();

        console.log("Jar deployed at:    ", jar);
        console.log("Via factory:        ", address(factory));
    }
}
