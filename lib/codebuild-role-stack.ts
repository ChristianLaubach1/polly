import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CodeBuildRoleStackProps extends StackProps {
  readonly account: string;
}

export class CodeBuildRoleStack extends Stack {
  public readonly codeBuildRoleArn: string;

  constructor(scope: Construct, id: string, props: CodeBuildRoleStackProps) {
    super(scope, id, props);

    // Create CodeBuild Role
    const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      inlinePolicies: {
        CodeBuildPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                's3:PutObject',
                's3:GetObject',
                's3:GetObjectVersion',
                'eks:DescribeCluster',
                'eks:ListClusters',
                'eks:ListNodegroups',
                'eks:DescribeNodegroup',
                'eks:ListFargateProfiles',
                'eks:DescribeFargateProfile',
                'eks:AccessKubernetesApi',
                'iam:PassRole',
                'polly:SynthesizeSpeech'
              ],
              resources: ['*'],
              effect: iam.Effect.ALLOW,
            }),
          ],
        }),
      },
    });

    this.codeBuildRoleArn = codeBuildRole.roleArn;

    new cdk.CfnOutput(this, 'CodeBuildRoleArn', {
      value: this.codeBuildRoleArn,
      exportName: 'CodeBuildRoleArn',
    });
  }
}
