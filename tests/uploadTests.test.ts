"use strict";
import { mock } from "node:test";
import GithubClient from "../src/GitHubClient/client";
import { expect } from "chai";

describe("parallel client updates", () => {
  const mockAnswer = {
    repoOwner: "mvelve",
    repoName: "TestActionsRepo",
    workFlowFileName: "",
  };

  const gitClient = new GithubClient(mockAnswer);
  it("should send parallel commits", async function () {
    await gitClient.uploadNTestFilesParallel([1, 2, 3, 4, 5, 6]); //you should assert some behaviour however need to do this
  });
});
