#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EksClusterStack } from '../lib/eks-cluster-stack';
import { CodeBuildRoleStack } from '../lib/codebuild-role-stack';
import { CodeBuildStack } from '../lib/codebuild-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const codeBuildRoleStack = new CodeBuildRoleStack(app, 'CodeBuildRoleStack', {
  env,
  account: env.account!,
});

const eksClusterStack = new EksClusterStack(app, 'EksClusterStack', {
  env,
  account: env.account!,
  region: env.region!,
  codeBuildRoleArn: codeBuildRoleStack.codeBuildRoleArn, // Dynamisch beziehen
});

const codeBuildStack = new CodeBuildStack(app, 'CodeBuildStack', {
  eksCluster: eksClusterStack.cluster,
  codeBuildRoleArn: cdk.Fn.importValue('CodeBuildRoleArn'),
  env,
});

const pipelineStack = new PipelineStack(app, 'PipelineStack', {
  buildProjectName: cdk.Fn.importValue('BuildProjectName'),
  deployProjectName: cdk.Fn.importValue('DeployProjectName'),
  env,
});

// Defining the dependencies
eksClusterStack.addDependency(codeBuildRoleStack);
codeBuildStack.addDependency(eksClusterStack);
pipelineStack.addDependency(codeBuildStack);

app.synth();
