"use strict";
import CLIClient from "./CommandLine/commandLine";

(async function () {
  const cli = new CLIClient();
  await cli.startClientWorkflow();
})();
