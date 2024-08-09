import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

interface PipelineStackProps extends StackProps {
  buildProjectName: string;
  deployProjectName: string;
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const githubSecret = sm.Secret.fromSecretNameV2(this, 'GithubToken', 'github');

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const buildProject = codebuild.PipelineProject.fromProjectName(this, 'ImportedBuildProject', props.buildProjectName);
    const deployProject = codebuild.PipelineProject.fromProjectName(this, 'ImportedDeployProject', props.deployProjectName);

    new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'PollyPipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: 'ChristianLaubach1',
              repo: 'polly',
              oauthToken: githubSecret.secretValue,
              output: sourceOutput,
              branch: 'main',
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Docker_Build',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'EKS_Deploy',
              project: deployProject,
              input: buildOutput,
            }),
          ],
        },
      ],
    });
  }
}
