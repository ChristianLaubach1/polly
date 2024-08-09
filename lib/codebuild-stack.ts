import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';

interface CodeBuildStackProps extends StackProps {
  eksCluster: eks.Cluster;
  codeBuildRoleArn: string;
}

export class CodeBuildStack extends Stack {
  constructor(scope: Construct, id: string, props: CodeBuildStackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    const githubSecret = sm.Secret.fromSecretNameV2(this, 'GithubToken', 'github');
    const dockerhubSecret = sm.Secret.fromSecretNameV2(this, 'DockerhubCredentials', 'dockerhub');

    const codeBuildRole = iam.Role.fromRoleArn(this, 'ImportedCodeBuildRole', props.codeBuildRoleArn);

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      environmentVariables: {
        'DOCKERHUB_USER': {
          type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          value: `${dockerhubSecret.secretArn}:username`,
        },
        'DOCKERHUB_PASS': {
          type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          value: `${dockerhubSecret.secretArn}:password`,
        },
        'AWS_ACCOUNT_ID': {
          value: account,
        },
        'AWS_REGION': {
          value: region,
        },
        'CLUSTER_NAME': {
          value: props.eksCluster.clusterName,
        },
      },
      role: codeBuildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'echo Installing dependencies...',
              'npm install',
              'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
              'unzip awscliv2.zip',
              './aws/install --update',
            ],
          },
          pre_build: {
            commands: [
              'echo Updating kubeconfig...',
              'aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION',
              'echo Verifying AWS identity...',
              'aws sts get-caller-identity',
              'echo Verifying kubeconfig...',
              'cat $HOME/.kube/config',
              'echo Logging in to Docker...',
              'echo $DOCKERHUB_PASS | docker login -u $DOCKERHUB_USER --password-stdin',
            ],
          },
          build: {
            commands: [
              'echo Building the Docker image...',
              'docker build -t christianlaubach1/polly-app:latest -f Dockerfile .',
              'docker push christianlaubach1/polly-app:latest',
            ],
          },
          // Entfernen der post_build Phase
        },
        artifacts: {
          files: [
            '**/*',
          ],
        },
      }),
    });

    const deployProject = new codebuild.PipelineProject(this, 'DeployProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      },
      environmentVariables: {
        'CLUSTER_NAME': {
          value: props.eksCluster.clusterName,
        },
        'KUBECONFIG': {
          value: '/root/.kube/config',
        },
        'AWS_ACCOUNT_ID': {
          value: account,
        },
        'AWS_REGION': {
          value: region,
        },
      },
      role: codeBuildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Downloading kubectl...',
              'curl -LO "https://dl.k8s.io/release/v1.30.0/bin/linux/amd64/kubectl"',
              'chmod +x kubectl',
              'mv kubectl /usr/local/bin/kubectl',
              'kubectl version --client',
              'aws eks update-kubeconfig --name $CLUSTER_NAME',
            ],
          },
          build: {
            commands: [
              'echo Applying Kubernetes configurations...',
              'kubectl apply -f lib/k8s/deployment.yaml --validate=false',
              'kubectl apply -f lib/k8s/service.yaml --validate=false',
            ],
          },
          // Entfernen der post_build Phase
        },
      }),
    });

    new cdk.CfnOutput(this, 'BuildProjectName', {
      value: buildProject.projectName,
      exportName: 'BuildProjectName',
    });

    new cdk.CfnOutput(this, 'DeployProjectName', {
      value: deployProject.projectName,
      exportName: 'DeployProjectName',
    });
  }
}
