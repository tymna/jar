// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {JarFactory} from "src/JarFactory.sol";

/// @notice Deploys the JarFactory once. Its address is the entry point every
///         client uses afterwards to create jars via factory.createJar(...).
contract DeployJarFactory is Script {
    function run() external returns (JarFactory factory) {
        // Deployer becomes the allowlist admin. JAR_TOKEN (optional) is
        // allowed right away so jars can be created immediately after deploy.
        address allowedToken = vm.envOr("JAR_TOKEN", address(0));

        vm.startBroadcast();
        // msg.sender in a script is Foundry's DefaultSender, NOT the
        // --account wallet — readCallers() returns the real broadcaster.
        (, address deployer,) = vm.readCallers();
        factory = new JarFactory(deployer);
        if (allowedToken != address(0)) {
            factory.addAllowedToken(allowedToken);
        }
        vm.stopBroadcast();

        console.log("JarFactory deployed at:", address(factory));
        console.log("Allowed token:", allowedToken);
    }
}
